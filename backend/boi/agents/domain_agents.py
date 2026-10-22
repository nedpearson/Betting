"""Domain Intelligence Agents (Agents 3 through 7).

Agent 3: Sports Intelligence
Agent 4: Crypto Intelligence
Agent 5: Economic Intelligence
Agent 6: Weather Intelligence
Agent 7: News Verification
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from ..events import EXTERNAL_UPDATE, Event, EventBus
from ..external.crypto import CryptoIntelligenceEngine
from ..external.economic import EconomicIntelligenceEngine
from ..external.news import NewsVerificationEngine
from ..external.sports import SportsIntelligenceEngine
from ..external.weather import WeatherIntelligenceEngine
from .base import BaseAgent

log = logging.getLogger("boi.agents.domain")


class SportsIntelligenceAgent(BaseAgent):
    def __init__(self, bus: EventBus, engine: SportsIntelligenceEngine):
        super().__init__(name="Agent-03-SportsIntelligence", role="Live Sports Modeler", bus=bus)
        self.engine = engine

    async def update_game(self, game_id: str, **kwargs) -> None:
        self.mark_active()
        state = self.engine.update_game_state(game_id=game_id, **kwargs)
        self.record_decision(
            f"Updated {state.sport} game {state.home_team} vs {state.away_team} ({state.home_score}-{state.away_score})",
            {"game_id": game_id, "score": f"{state.home_score}-{state.away_score}"},
        )
        await self.bus.publish(
            Event(
                type=EXTERNAL_UPDATE,
                source=self.name,
                payload={"domain": "sports", "game_id": game_id, "is_live": state.is_live},
            )
        )


class CryptoIntelligenceAgent(BaseAgent):
    def __init__(self, bus: EventBus, engine: CryptoIntelligenceEngine):
        super().__init__(name="Agent-04-CryptoIntelligence", role="Digital Asset Quantitative Analyst", bus=bus)
        self.engine = engine
        self._running = False
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        if self._task is None:
            self._running = True
            self._task = asyncio.create_task(self._poll_loop(), name="crypto-agent")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _poll_loop(self) -> None:
        while self._running:
            self.mark_active()
            for sym in ("BTC", "ETH", "SOL"):
                st = await self.engine.poll_spot(sym)
                if st:
                    self.record_decision(
                        f"{sym} spot: ${st.spot_price:,.2f} | vol: {st.daily_vol*100:.1f}%",
                        {"spot": st.spot_price, "vol": st.daily_vol},
                    )
            await asyncio.sleep(20.0)


class EconomicIntelligenceAgent(BaseAgent):
    def __init__(self, bus: EventBus, engine: EconomicIntelligenceEngine):
        super().__init__(name="Agent-05-EconomicIntelligence", role="Macroeconomic Analyst", bus=bus)
        self.engine = engine

    async def refresh_macro(self) -> None:
        self.mark_active()
        for series_id in ("FEDFUNDS", "CPIAUCSL", "UNRATE"):
            ind = await self.engine.refresh_indicator(series_id)
            if ind:
                self.record_decision(f"{ind.name}: {ind.latest_value} ({ind.latest_date})")


class WeatherIntelligenceAgent(BaseAgent):
    def __init__(self, bus: EventBus, engine: WeatherIntelligenceEngine):
        super().__init__(name="Agent-06-WeatherIntelligence", role="Meteorological Forecast Analyst", bus=bus)
        self.engine = engine

    async def get_city_forecast(self, city_code: str, target_date: str, metric: str = "high"):
        self.mark_active()
        fc = await self.engine.get_forecast(city_code=city_code, target_date=target_date, metric=metric)
        if fc:
            self.record_decision(
                f"{city_code} {target_date} {metric}: {fc.mean_temp:.1f}F (sd={fc.stdev_temp:.1f}F, members={len(fc.ensemble_members)})",
                {"mean": fc.mean_temp, "stdev": fc.stdev_temp, "observed": fc.observed_so_far},
            )
        return fc


class NewsVerificationAgent(BaseAgent):
    def __init__(self, bus: EventBus, engine: NewsVerificationEngine):
        super().__init__(name="Agent-07-NewsVerification", role="News Provenance & Source Auditor", bus=bus)
        self.engine = engine

    def verify_and_record(self, source: str, title: str, summary: str, url: str) -> None:
        self.mark_active()
        item = self.engine.record_item(source_name=source, title=title, summary=summary, url=url)
        if item:
            self.record_decision(f"Verified news: [{item.source_name}] {item.title[:60]}")
