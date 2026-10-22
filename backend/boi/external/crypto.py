"""Cryptocurrency Intelligence Engine.

Kalshi crypto contracts (e.g., KXBTCD, KXETHD, KXSOL, KXXRP, KXDOGE):
- Contracts specify an hourly or daily target time.
- Official settlement benchmark: CF Benchmarks Real-Time Index (BRTI, ETHUSD_RTI, etc.),
  calculated as the 60-second volume-weighted average immediately prior to expiration.
- This engine:
    1. Ingests high-frequency spot ticks from authorized exchange feeds (Coinbase Exchange API).
    2. Maintains real-time rolling and EWMA realized volatility.
    3. Models the basis spread between spot exchange prices and CF Benchmarks.
    4. Computes probability of settlement above/below strike using log-normal diffusion
       with volatility uncertainty bands.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx

from ..health import FeedHealth
from ..stats import clamp, ewma_vol, norm_cdf

log = logging.getLogger("boi.external.crypto")

# Map Kalshi crypto series to Coinbase products
CRYPTO_MAP = {
    "BTC": "BTC-USD",
    "ETH": "ETH-USD",
    "SOL": "SOL-USD",
    "XRP": "XRP-USD",
    "DOGE": "DOGE-USD",
}


@dataclass
class CryptoState:
    symbol: str
    spot_price: float
    spot_bid: float
    spot_ask: float
    daily_vol: float  # annualized volatility
    recent_prices: list[float]
    last_update_utc: datetime
    source: str = "coinbase_rest"


class CryptoIntelligenceEngine:
    def __init__(self, health: FeedHealth | None = None):
        self._http = httpx.AsyncClient(timeout=10.0)
        self.health = health or FeedHealth(
            name="crypto_coinbase",
            description="Coinbase Exchange Spot Market Data",
            stale_after_sec=30.0,
            transport="rest_poll",
            licensing_note="Coinbase Public Market Data API (proxy for CF Benchmarks)",
            settlement_grade=False,  # CF Benchmarks is the official settlement source; basis risk modeled
        )
        self.states: dict[str, CryptoState] = {}
        # Historical return series for vol estimation
        self._price_history: dict[str, list[float]] = {}

    async def close(self) -> None:
        await self._http.aclose()

    async def poll_spot(self, symbol: str = "BTC") -> CryptoState | None:
        product_id = CRYPTO_MAP.get(symbol.upper(), f"{symbol.upper()}-USD")
        url = f"https://api.exchange.coinbase.com/products/{product_id}/ticker"
        try:
            t0 = datetime.now(UTC)
            resp = await self._http.get(url)
            resp.raise_for_status()
            data = resp.json()

            price = float(data["price"])
            bid = float(data.get("bid", price))
            ask = float(data.get("ask", price))

            history = self._price_history.setdefault(symbol, [])
            history.append(price)
            if len(history) > 300:
                history.pop(0)

            # Compute realized vol from price history or default to baseline
            daily_vol = 0.55  # default baseline annualized vol for BTC (~55%)
            if len(history) >= 10:
                log_rets = [math.log(history[i] / history[i - 1]) for i in range(1, len(history))]
                # Annualize 1-minute sampled volatility
                min_vol = ewma_vol(log_rets, lam=0.95)
                if not math.isnan(min_vol) and min_vol > 0:
                    daily_vol = min_vol * math.sqrt(365.25 * 24 * 60)
                    daily_vol = max(0.20, min(1.80, daily_vol))

            state = CryptoState(
                symbol=symbol,
                spot_price=price,
                spot_bid=bid,
                spot_ask=ask,
                daily_vol=daily_vol,
                recent_prices=list(history[-30:]),
                last_update_utc=datetime.now(UTC),
            )
            self.states[symbol] = state
            self.health.mark_ok(source_ts=t0)
            return state
        except Exception as e:
            log.warning("Failed to poll crypto spot for %s: %s", symbol, e)
            self.health.mark_error(str(e))
            return None

    def evaluate_contract(
        self,
        symbol: str,
        strike: float,
        strike_type: str,  # "greater" | "less"
        expiration_time: datetime,
    ) -> tuple[float, float, float] | None:
        """Computes (p_point, p_conservative, p_high) for crypto contract."""
        state = self.states.get(symbol)
        if not state:
            return None

        now = datetime.now(UTC)
        time_to_exp_sec = (expiration_time - now).total_seconds()
        if time_to_exp_sec <= 0:
            # Already expired
            is_above = state.spot_price > strike
            p = 1.0 if is_above else 0.0
            return (p, p, p)

        # Time in years
        t_years = max(time_to_exp_sec / (365.25 * 86400.0), 1e-6)

        # Spot price and annualized volatility
        S = state.spot_price
        sigma = state.daily_vol

        # Add basis uncertainty between exchange spot and CF Benchmarks 60-sec average
        basis_spread_std = 0.0015  # 15 bps basis uncertainty
        total_sigma = math.sqrt(sigma**2 + (basis_spread_std / math.sqrt(max(t_years, 1.0 / 8760.0))) ** 2)

        # Log-normal diffusion d2: P(S_T > K) = N(d2) under risk-neutral / driftless assumption
        d2 = (math.log(S / strike) - 0.5 * (total_sigma**2) * t_years) / (total_sigma * math.sqrt(t_years))
        p_above = norm_cdf(d2)

        # Uncertainty band from vol estimation error (+/- 15% relative vol)
        sigma_low = total_sigma * 0.85
        sigma_high = total_sigma * 1.15
        d2_vol_low = (math.log(S / strike) - 0.5 * (sigma_low**2) * t_years) / (sigma_low * math.sqrt(t_years))
        d2_vol_high = (math.log(S / strike) - 0.5 * (sigma_high**2) * t_years) / (sigma_high * math.sqrt(t_years))

        p_band_1 = norm_cdf(d2_vol_low)
        p_band_2 = norm_cdf(d2_vol_high)

        p_point = clamp(p_above, 0.005, 0.995)
        p_min = clamp(min(p_above, p_band_1, p_band_2) - 0.03, 0.001, 0.999)
        p_max = clamp(max(p_above, p_band_1, p_band_2) + 0.03, 0.001, 0.999)

        if strike_type == "greater":
            return (p_point, p_min, p_max)
        else:
            return (1.0 - p_point, 1.0 - p_max, 1.0 - p_min)
