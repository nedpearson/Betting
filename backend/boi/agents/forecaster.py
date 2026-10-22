"""Agent 8 — Quantitative Forecasting.

Translates external evidence into calibrated probability estimates.
Guarantees model independence where applicable and maintains uncertainty bounds.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

from ..db import Database, ForecastRecord, MarketRecord
from ..events import FORECAST_UPDATED, Event, EventBus
from ..external.crypto import CryptoIntelligenceEngine
from ..external.sports import SportsIntelligenceEngine
from ..external.weather import WeatherIntelligenceEngine
from ..orderbook import MarketOrderBook
from .base import BaseAgent

log = logging.getLogger("boi.agents.forecaster")


class QuantitativeForecastingAgent(BaseAgent):
    def __init__(
        self,
        bus: EventBus,
        db: Database,
        books: dict[str, MarketOrderBook],
        weather_engine: WeatherIntelligenceEngine,
        crypto_engine: CryptoIntelligenceEngine,
        sports_engine: SportsIntelligenceEngine,
    ):
        super().__init__(name="Agent-08-QuantitativeForecasting", role="Quantitative Probabilistic Modeler", bus=bus)
        self.db = db
        self.books = books
        self.weather = weather_engine
        self.crypto = crypto_engine
        self.sports = sports_engine
        self.latest_forecasts: dict[str, ForecastRecord] = {}

    async def forecast_market(self, market: MarketRecord) -> ForecastRecord | None:
        self.mark_active()
        ticker = market.ticker
        book = self.books.get(ticker)
        p_market = None
        if book:
            snap = book.get_snapshot()
            if snap.mid_price is not None:
                p_market = float(snap.mid_price)

        rec = None
        # Route to appropriate model based on market series
        if market.series_ticker.startswith("KXHIGH") or market.series_ticker.startswith("KXLOW"):
            rec = await self._forecast_weather(market, p_market)
        elif market.series_ticker.startswith("KXBTC") or market.series_ticker.startswith("KXETH"):
            rec = await self._forecast_crypto(market, p_market)
        elif market.series_ticker.startswith("KXNBA") or market.series_ticker.startswith("KXNFL"):
            rec = await self._forecast_sports(market, p_market)

        if rec:
            self.latest_forecasts[ticker] = rec
            async with self.db.session() as s:
                await s.merge(rec)
                await s.commit()

            self.record_decision(
                f"Forecast for {ticker}: P(YES)={rec.p_yes:.1%} [{rec.p_low:.1%}, {rec.p_high:.1%}] (market={p_market if p_market is not None else 'N/A'})",
                {"p_yes": rec.p_yes, "p_low": rec.p_low, "p_high": rec.p_high, "model": rec.model},
            )
            await self.bus.publish(
                Event(
                    type=FORECAST_UPDATED,
                    source=self.name,
                    ticker=ticker,
                    payload={
                        "forecast_id": rec.id,
                        "ticker": ticker,
                        "p_yes": rec.p_yes,
                        "p_low": rec.p_low,
                        "p_high": rec.p_high,
                        "p_market": rec.p_market,
                        "model": rec.model,
                        "independence": rec.independence,
                    },
                )
            )
        return rec

    async def _forecast_weather(self, market: MarketRecord, p_market: float | None) -> ForecastRecord | None:
        city = self.weather.parse_series_city(market.series_ticker)
        if not city:
            return None

        # Parse target date from event_ticker e.g. KXHIGHNY-26OCT22
        target_date_str = None
        parts = market.event_ticker.split("-")
        if len(parts) >= 2:
            raw_date = parts[1]  # e.g. 26OCT22
            try:
                dt = datetime.strptime(raw_date, "%y%b%d")
                target_date_str = dt.strftime("%Y-%m-%d")
            except Exception:
                pass

        if not target_date_str:
            target_date_str = datetime.now(UTC).strftime("%Y-%m-%d")

        metric = "high" if "HIGH" in market.series_ticker else "low"
        fc_dist = await self.weather.get_forecast(city, target_date_str, metric=metric)
        if not fc_dist:
            return None

        raw = market.raw or {}
        strike_type = raw.get("strike_type", "greater")
        floor_strike = float(raw.get("floor_strike") or 0)
        cap_strike = float(raw.get("cap_strike") or 0)

        if strike_type == "greater":
            p_point, p_low, p_high = fc_dist.prob_greater(floor_strike)
        elif strike_type == "less":
            p_point, p_low, p_high = fc_dist.prob_less(cap_strike)
        elif strike_type == "between":
            p_point, p_low, p_high = fc_dist.prob_between(floor_strike, cap_strike)
        else:
            return None

        return ForecastRecord(
            id=str(uuid.uuid4()),
            ticker=market.ticker,
            ts=datetime.now(UTC),
            model="weather_ensemble_kde_v1",
            model_version="1.0.0",
            independence="independent",
            p_yes=p_point,
            p_low=p_low,
            p_high=p_high,
            p_market=p_market,
            inputs={
                "city": city,
                "target_date": target_date_str,
                "metric": metric,
                "ensemble_mean": fc_dist.mean_temp,
                "ensemble_stdev": fc_dist.stdev_temp,
                "observed_so_far": fc_dist.observed_so_far,
                "strike_type": strike_type,
                "floor_strike": floor_strike,
                "cap_strike": cap_strike,
            },
        )

    async def _forecast_crypto(self, market: MarketRecord, p_market: float | None) -> ForecastRecord | None:
        sym = "BTC" if "BTC" in market.series_ticker else "ETH"
        raw = market.raw or {}
        strike = float(raw.get("floor_strike") or raw.get("cap_strike") or 0)
        if strike <= 0:
            return None

        strike_type = raw.get("strike_type", "greater")
        exp_time = market.close_time or datetime.now(UTC)

        probs = self.crypto.evaluate_contract(
            symbol=sym,
            strike=strike,
            strike_type=strike_type,
            expiration_time=exp_time,
        )
        if not probs:
            return None

        p_point, p_low, p_high = probs
        st = self.crypto.states.get(sym)

        return ForecastRecord(
            id=str(uuid.uuid4()),
            ticker=market.ticker,
            ts=datetime.now(UTC),
            model="crypto_diffusion_v1",
            model_version="1.0.0",
            independence="independent",
            p_yes=p_point,
            p_low=p_low,
            p_high=p_high,
            p_market=p_market,
            inputs={
                "symbol": sym,
                "spot_price": st.spot_price if st else None,
                "daily_vol": st.daily_vol if st else None,
                "strike": strike,
                "strike_type": strike_type,
                "exp_time": exp_time.isoformat(),
            },
        )

    async def _forecast_sports(self, market: MarketRecord, p_market: float | None) -> ForecastRecord | None:
        # Sports in-game margin model
        game_id = market.event_ticker
        probs = self.sports.calculate_win_prob(game_id=game_id, pregame_spread_home=0.0)
        if not probs:
            # Fall back to baseline if game is not live
            return None

        p_point, p_low, p_high = probs
        return ForecastRecord(
            id=str(uuid.uuid4()),
            ticker=market.ticker,
            ts=datetime.now(UTC),
            model="sports_inplay_margin_v1",
            model_version="1.0.0",
            independence="market_informed",
            p_yes=p_point,
            p_low=p_low,
            p_high=p_high,
            p_market=p_market,
            inputs={"game_id": game_id},
        )
