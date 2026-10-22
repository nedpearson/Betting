import asyncio
import os
from boi.db import Database, MarketRecord
from boi.events import EventBus
from boi.kalshi.client import KalshiRestClient
from boi.agents.discovery import MarketDiscoveryAgent
from boi.agents.forecaster import QuantitativeForecastingAgent
from boi.agents.microstructure import MarketMicrostructureAgent
from boi.agents.ev_analyst import ExpectedValueAnalystAgent
from boi.agents.risk_manager import PortfolioRiskManagerAgent
from boi.agents.auditors import BehavioralRiskAgent
from boi.agents.cio import ChiefInvestmentOfficerAgent
from boi.external.weather import WeatherIntelligenceEngine
from boi.external.crypto import CryptoIntelligenceEngine
from boi.external.sports import SportsIntelligenceEngine
from sqlalchemy import select

async def main():
    db_path = "backend/data/boi.db" if os.path.exists("backend/data/boi.db") else "data/boi.db"
    db = Database(f"sqlite+aiosqlite:///{db_path}")
    bus = EventBus()
    rest = KalshiRestClient()
    books = {}
    weather = WeatherIntelligenceEngine()
    crypto = CryptoIntelligenceEngine()
    sports = SportsIntelligenceEngine()

    disc = MarketDiscoveryAgent(bus=bus, rest_client=rest, db=db, books=books)
    fc = QuantitativeForecastingAgent(bus=bus, db=db, books=books, weather_engine=weather, crypto_engine=crypto, sports_engine=sports)
    micro = MarketMicrostructureAgent(bus=bus, books=books)
    ev = ExpectedValueAnalystAgent(bus=bus, books=books)
    risk = PortfolioRiskManagerAgent(bus=bus, db=db)
    beh = BehavioralRiskAgent(bus=bus)
    cio = ChiefInvestmentOfficerAgent(bus=bus, db=db, books=books, forecaster=fc, microstructure=micro, ev_analyst=ev, risk_manager=risk, behavioral_risk=beh)

    try:
        await disc.run_scan_once()
        print(f"Books: {len(books)}")

        async with db.session() as s:
            mkts = list((await s.execute(select(MarketRecord))).scalars().all())
        print(f"Markets in db: {len(mkts)}")

        # Run forecast on each market
        modeled = 0
        for m in mkts:
            rec = await fc.forecast_market(m)
            if rec:
                modeled += 1
        print(f"Forecasts generated: {modeled}")

        # Now rank opportunities in CIO
        recs = await cio.scan_and_rank_opportunities()
        print(f"Opportunities recommended: {len(recs)}")
        for r in recs[:5]:
            p = r.payload
            print(f"REC: {r.ticker} | Action: {r.action} | ROI: {p.get('net_roi')} | Edge: {p.get('conservative_edge')}")
    finally:
        await rest.close()
        await weather.close()
        await crypto.close()

asyncio.run(main())
