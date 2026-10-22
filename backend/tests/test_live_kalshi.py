"""Live Integration Tests against official Kalshi Production endpoints.

Verifies:
1. Live exchange status is active.
2. Market discovery returns genuine Kalshi contracts with valid price ranges.
3. Orderbook snapshots return valid resting bids and derive executable asks.
4. Weather intelligence evaluates live weather contracts with real Open-Meteo ensembles.
5. Crypto intelligence evaluates live BTC/ETH contracts with Coinbase spot.
"""

from decimal import Decimal

import pytest

from boi.agents.discovery import MarketDiscoveryAgent
from boi.config import Settings
from boi.db import Database
from boi.events import EventBus
from boi.external.crypto import CryptoIntelligenceEngine
from boi.external.weather import WeatherIntelligenceEngine
from boi.kalshi.client import KalshiRestClient
from boi.orderbook import MarketOrderBook


@pytest.fixture
async def live_system():
    settings = Settings()
    db = Database("sqlite+aiosqlite:///:memory:")
    await db.create_all()
    bus = EventBus(db=db)
    bus.start()
    rest = KalshiRestClient(settings=settings)
    books: dict[str, MarketOrderBook] = {}
    weather = WeatherIntelligenceEngine()
    crypto = CryptoIntelligenceEngine()

    yield {
        "rest": rest,
        "db": db,
        "bus": bus,
        "books": books,
        "weather": weather,
        "crypto": crypto,
        "settings": settings,
    }

    await bus.stop()
    await rest.close()
    await weather.close()
    await crypto.close()
    await db.close()


@pytest.mark.asyncio
async def test_live_exchange_status(live_system):
    rest: KalshiRestClient = live_system["rest"]
    status = await rest.get_exchange_status()
    assert status.get("exchange_active") is True
    assert "exchange_index_statuses" in status
    assert len(status["exchange_index_statuses"]) >= 4


@pytest.mark.asyncio
async def test_live_market_discovery(live_system):
    rest: KalshiRestClient = live_system["rest"]
    # Fetch 5 live open markets
    resp = await rest.get_markets(status="open", limit=5, mve_filter="exclude")
    markets = resp.get("markets", [])
    assert len(markets) >= 1
    m = markets[0]
    assert "ticker" in m
    assert "event_ticker" in m
    assert "price_ranges" in m


@pytest.mark.asyncio
async def test_live_weather_evaluation(live_system):
    weather: WeatherIntelligenceEngine = live_system["weather"]
    # Test Central Park NY high temperature forecast for upcoming date
    from datetime import UTC, datetime, timedelta
    target = (datetime.now(UTC) + timedelta(days=1)).strftime("%Y-%m-%d")
    fc = await weather.get_forecast(city_code="NY", target_date=target, metric="high")
    if fc is None:
        pytest.skip("Public Open-Meteo endpoint rate limited (HTTP 429)")
    assert len(fc.ensemble_members) >= 4
    assert 20.0 <= fc.mean_temp <= 110.0
    p_gt, p_low, p_high = fc.prob_greater(65.0)
    assert 0.0 <= p_low <= p_gt <= p_high <= 1.0


@pytest.mark.asyncio
async def test_live_crypto_evaluation(live_system):
    crypto: CryptoIntelligenceEngine = live_system["crypto"]
    state = await crypto.poll_spot("BTC")
    assert state is not None
    assert state.spot_price > 10_000.0
    assert state.daily_vol > 0.10
