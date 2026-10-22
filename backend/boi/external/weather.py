"""Weather Intelligence Engine.

Kalshi daily high/low temperature contracts (e.g. KXHIGHNY, KXHIGHDEN, KXHIGHTATL):
- Settle on the maximum or minimum temperature recorded at the contract's official station
  (e.g., CLINYC for Central Park, New York) by The Weather Company / NWS.
- Settlement values are integer degrees Fahrenheit.
- Strikes:
    - greater: resolves YES if T > floor_strike (e.g. floor_strike=70 -> 71F or above)
    - less: resolves YES if T <= cap_strike (e.g. cap_strike=63 -> 63F or below)
    - between: resolves YES if floor_strike <= T <= cap_strike

This module:
1. Maps Kalshi market city codes to exact lat/lon coordinates and station IDs.
2. Ingests multi-model ensembles (NCEP GEFS, ECMWF IFS, ICON) from Open-Meteo.
3. Incorporates NWS real-time station observations (if temperature already hit X today,
   max temperature cannot be lower than X).
4. Emits a discrete probability distribution over integer temperatures with uncertainty bounds.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx

from ..health import FeedHealth
from ..stats import clamp, norm_cdf, stdev

log = logging.getLogger("boi.external.weather")

# Map Kalshi city series codes to geographic coordinates and official stations
STATION_MAP: dict[str, dict[str, Any]] = {
    "NY": {"name": "New York City (Central Park)", "lat": 40.779, "lon": -73.969, "station": "KNYC", "tz": "America/New_York"},
    "NYC": {"name": "New York City (Central Park)", "lat": 40.779, "lon": -73.969, "station": "KNYC", "tz": "America/New_York"},
    "DEN": {"name": "Denver (DIA)", "lat": 39.856, "lon": -104.674, "station": "KDEN", "tz": "America/Denver"},
    "TEMPDEN": {"name": "Denver (DIA)", "lat": 39.856, "lon": -104.674, "station": "KDEN", "tz": "America/Denver"},
    "CHI": {"name": "Chicago (O'Hare)", "lat": 41.974, "lon": -87.907, "station": "KORD", "tz": "America/Chicago"},
    "MIA": {"name": "Miami (MIA)", "lat": 25.795, "lon": -80.287, "station": "KMIA", "tz": "America/New_York"},
    "AUS": {"name": "Austin (Camp Mabry)", "lat": 30.317, "lon": -97.767, "station": "KATT", "tz": "America/Chicago"},
    "LAX": {"name": "Los Angeles (LAX)", "lat": 33.942, "lon": -118.408, "station": "KLAX", "tz": "America/Los_Angeles"},
    "PHIL": {"name": "Philadelphia (PHL)", "lat": 39.872, "lon": -75.241, "station": "KPHL", "tz": "America/New_York"},
    "ATL": {"name": "Atlanta (Hartsfield)", "lat": 33.640, "lon": -84.428, "station": "KATL", "tz": "America/New_York"},
    "HOU": {"name": "Houston (Bush Intercontinental)", "lat": 29.980, "lon": -95.340, "station": "KIAH", "tz": "America/Chicago"},
    "PHX": {"name": "Phoenix (Sky Harbor)", "lat": 33.437, "lon": -112.008, "station": "KPHX", "tz": "America/Phoenix"},
    "SEA": {"name": "Seattle (Sea-Tac)", "lat": 47.450, "lon": -122.309, "station": "KSEA", "tz": "America/Los_Angeles"},
    "BOS": {"name": "Boston (Logan)", "lat": 42.365, "lon": -71.010, "station": "KBOS", "tz": "America/New_York"},
    "SFO": {"name": "San Francisco (SFO)", "lat": 37.619, "lon": -122.375, "station": "KSFO", "tz": "America/Los_Angeles"},
    "DC": {"name": "Washington DC (Reagan National)", "lat": 38.851, "lon": -77.038, "station": "KDCA", "tz": "America/New_York"},
    "MIN": {"name": "Minneapolis (MSP)", "lat": 44.885, "lon": -93.222, "station": "KMSP", "tz": "America/Chicago"},
}


@dataclass
class WeatherForecastDistribution:
    city_code: str
    target_date: str  # YYYY-MM-DD
    metric: str  # "high" | "low"
    ensemble_members: list[float]
    mean_temp: float
    stdev_temp: float
    observed_so_far: float | None
    source_ts: datetime
    model_name: str = "ensemble_kde_v1"

    def prob_greater(self, strike: float) -> tuple[float, float, float]:
        """Returns (p_point, p_conservative, p_high) for T > strike."""
        # Check physical bounds if already observed today
        if self.metric == "high" and self.observed_so_far is not None:
            if self.observed_so_far > strike:
                return (1.0, 1.0, 1.0)

        # Count ensemble members exceeding strike
        n = len(self.ensemble_members)
        if n == 0:
            return (0.5, 0.3, 0.7)

        # Gaussian smoothing over ensemble
        # Account for integer discretization: T > strike means T >= floor(strike) + 1
        threshold = strike + 0.5
        count = sum(1.0 for x in self.ensemble_members if x > strike)
        p_raw = count / n

        # Parametric distribution estimate
        sd = max(1.2, self.stdev_temp)
        z = (threshold - self.mean_temp) / sd
        p_param = 1.0 - norm_cdf(z)

        # Blend ensemble frequency and parametric tail model
        p_point = 0.65 * p_raw + 0.35 * p_param
        p_point = clamp(p_point, 0.005, 0.995)

        # Conservative margin based on ensemble uncertainty and basis risk to settlement agency
        uncertainty = max(0.04, 1.2 / (n ** 0.5))
        p_low = clamp(p_point - uncertainty, 0.001, 0.999)
        p_high = clamp(p_point + uncertainty, 0.001, 0.999)

        return (p_point, p_low, p_high)

    def prob_less(self, strike: float) -> tuple[float, float, float]:
        """Returns (p_point, p_conservative, p_high) for T <= strike."""
        if self.metric == "high" and self.observed_so_far is not None:
            if self.observed_so_far > strike:
                return (0.0, 0.0, 0.0)

        p_gt, p_gt_low, p_gt_high = self.prob_greater(strike)
        # Complementary probabilities
        p_point = 1.0 - p_gt
        p_low = 1.0 - p_gt_high
        p_high = 1.0 - p_gt_low
        return (p_point, p_low, p_high)

    def prob_between(self, floor_strike: float, cap_strike: float) -> tuple[float, float, float]:
        """Returns (p_point, p_conservative, p_high) for floor_strike <= T <= cap_strike."""
        # P(T <= cap) - P(T < floor)
        # For integer temperatures: P(floor <= T <= cap)
        p_below_cap, _, _ = self.prob_less(cap_strike)
        p_below_floor_minus_1, _, _ = self.prob_less(floor_strike - 1.0)
        p_point = max(0.0, p_below_cap - p_below_floor_minus_1)
        p_point = clamp(p_point, 0.005, 0.995)

        n = len(self.ensemble_members)
        uncertainty = max(0.04, 1.5 / (n ** 0.5))
        p_low = clamp(p_point - uncertainty, 0.001, 0.999)
        p_high = clamp(p_point + uncertainty, 0.001, 0.999)
        return (p_point, p_low, p_high)


class WeatherIntelligenceEngine:
    def __init__(self, health: FeedHealth | None = None):
        self._http = httpx.AsyncClient(timeout=15.0)
        self.health = health or FeedHealth(
            name="weather_openmeteo",
            description="Open-Meteo Ensemble Weather API & NWS Observations",
            stale_after_sec=1800.0,
            transport="rest_poll",
            licensing_note="Open-Meteo open weather models + NOAA public domain",
            settlement_grade=False,  # Settlement source is The Weather Company; basis risk is modeled
        )
        self._cache: dict[str, WeatherForecastDistribution] = {}

    async def close(self) -> None:
        await self._http.aclose()

    def parse_series_city(self, series_ticker: str) -> str | None:
        """Extract city identifier from ticker like KXHIGHNY, KXLOWDEN, KXHIGHTATL."""
        clean = series_ticker.upper()
        for prefix in ("KXHIGHT", "KXLOWT", "KXHIGH", "KXLOW"):
            if clean.startswith(prefix):
                city = clean[len(prefix):]
                if city in STATION_MAP:
                    return city
        return None

    async def get_forecast(self, city_code: str, target_date: str, metric: str = "high") -> WeatherForecastDistribution | None:
        cache_key = f"{city_code}:{target_date}:{metric}"
        if cache_key in self._cache:
            fc = self._cache[cache_key]
            # Cache for 15 minutes
            if (datetime.now(UTC) - fc.source_ts).total_seconds() < 900:
                return fc

        info = STATION_MAP.get(city_code)
        if not info:
            return None

        daily_var = "temperature_2m_max" if metric == "high" else "temperature_2m_min"
        url = (
            f"https://ensemble-api.open-meteo.com/v1/ensemble"
            f"?latitude={info['lat']}&longitude={info['lon']}"
            f"&daily={daily_var}&models=gfs025,ecmwf_ifs025,icon_seamless"
            f"&temperature_unit=fahrenheit&timezone={info['tz']}&forecast_days=4"
        )

        try:
            t0 = datetime.now(UTC)
            resp = await self._http.get(url)
            resp.raise_for_status()
            data = resp.json()

            daily = data.get("daily", {})
            times = daily.get("time", [])
            if target_date not in times:
                return None
            idx = times.index(target_date)

            # Collect all ensemble member predictions for that date
            members: list[float] = []
            for k, vals in daily.items():
                if k.startswith(daily_var) and len(vals) > idx and vals[idx] is not None:
                    members.append(float(vals[idx]))

            if not members:
                return None

            m_val = sum(members) / len(members)
            s_val = stdev(members) if len(members) > 1 else 2.0

            # Query real-time station observation if today
            observed = None
            today_str = datetime.now(UTC).strftime("%Y-%m-%d")
            if target_date == today_str and info.get("station"):
                observed = await self._get_station_observed_extreme(info["station"], metric)

            fc = WeatherForecastDistribution(
                city_code=city_code,
                target_date=target_date,
                metric=metric,
                ensemble_members=members,
                mean_temp=m_val,
                stdev_temp=s_val,
                observed_so_far=observed,
                source_ts=datetime.now(UTC),
            )
            self._cache[cache_key] = fc
            self.health.mark_ok(source_ts=t0)
            return fc
        except Exception as e:
            log.warning("Failed to fetch weather forecast for %s on %s: %s", city_code, target_date, e)
            self.health.mark_error(str(e))
            return None

    async def _get_station_observed_extreme(self, station: str, metric: str) -> float | None:
        """Fetch today's observed high or low from NWS API for the station."""
        try:
            url = f"https://api.weather.gov/stations/{station}/observations"
            resp = await self._http.get(url, headers={"User-Agent": "BettingIntelligenceOS/0.1"})
            if resp.status_code == 200:
                features = resp.json().get("features", [])
                temps_f = []
                for f in features[:24]:  # last 24 observations
                    props = f.get("properties", {})
                    temp_c = props.get("temperature", {}).get("value")
                    if temp_c is not None:
                        temps_f.append(temp_c * 9.0 / 5.0 + 32.0)
                if temps_f:
                    return max(temps_f) if metric == "high" else min(temps_f)
        except Exception:
            pass
        return None
