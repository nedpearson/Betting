"""Economic and Financial Markets Intelligence Engine.

Monitors macro-economic indicators, Fed decisions, and economic series on Kalshi
(e.g., KXFED, KXCPI, KXUNEMPLOYMENT, KXJOBLESS).
Incorporates FRED (Federal Reserve Economic Data) API if configured.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx

from ..config import Settings, get_settings
from ..health import FeedHealth
from ..stats import clamp, norm_cdf

log = logging.getLogger("boi.external.economic")


@dataclass
class EconomicIndicator:
    series_id: str
    name: str
    latest_value: float | None
    latest_date: str | None
    consensus: float | None
    historical_std: float
    last_update_utc: datetime


class EconomicIntelligenceEngine:
    def __init__(self, settings: Settings | None = None, health: FeedHealth | None = None):
        self.settings = settings or get_settings()
        self._http = httpx.AsyncClient(timeout=15.0)
        self.health = health or FeedHealth(
            name="economic_fred",
            description="Federal Reserve Economic Data (FRED) API",
            stale_after_sec=86400.0,
            transport="rest_poll",
            configured=self.settings.fred_api_key is not None,
            licensing_note="Federal Reserve Bank of St. Louis public data API",
            settlement_grade=True,
        )
        self.indicators: dict[str, EconomicIndicator] = {
            "FEDFUNDS": EconomicIndicator("FEDFUNDS", "Federal Funds Effective Rate", 4.83, "2026-10", 4.83, 0.12, datetime.now(UTC)),
            "CPIAUCSL": EconomicIndicator("CPIAUCSL", "Consumer Price Index (All Urban)", 314.5, "2026-09", 314.8, 0.25, datetime.now(UTC)),
            "UNRATE": EconomicIndicator("UNRATE", "Civilian Unemployment Rate", 4.1, "2026-09", 4.1, 0.10, datetime.now(UTC)),
        }

    async def close(self) -> None:
        await self._http.aclose()

    async def refresh_indicator(self, fred_series_id: str) -> EconomicIndicator | None:
        if not self.settings.fred_api_key:
            return self.indicators.get(fred_series_id)

        api_key = self.settings.fred_api_key.get_secret_value()
        url = (
            f"https://api.stlouisfed.org/fred/series/observations"
            f"?series_id={fred_series_id}&api_key={api_key}&file_type=json&sort_order=desc&limit=5"
        )
        try:
            t0 = datetime.now(UTC)
            resp = await self._http.get(url)
            resp.raise_for_status()
            data = resp.json()
            obs = data.get("observations", [])
            if obs:
                val = float(obs[0]["value"])
                dt = obs[0]["date"]
                ind = self.indicators.get(fred_series_id)
                std = ind.historical_std if ind else 0.15
                name = ind.name if ind else fred_series_id
                indicator = EconomicIndicator(
                    series_id=fred_series_id,
                    name=name,
                    latest_value=val,
                    latest_date=dt,
                    consensus=val,
                    historical_std=std,
                    last_update_utc=datetime.now(UTC),
                )
                self.indicators[fred_series_id] = indicator
                self.health.mark_ok(source_ts=t0)
                return indicator
        except Exception as e:
            log.warning("FRED poll failed for %s: %s", fred_series_id, e)
            self.health.mark_error(str(e))
        return self.indicators.get(fred_series_id)
