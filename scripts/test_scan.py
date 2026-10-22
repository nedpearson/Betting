import asyncio
import os
from boi.db import Database, MarketRecord
from boi.events import EventBus
from boi.kalshi.client import KalshiRestClient
from boi.agents.discovery import MarketDiscoveryAgent
from boi.config import get_settings

async def main():
    db_path = "backend/data/boi.db" if os.path.exists("backend/data/boi.db") else "data/boi.db"
    db = Database(f"sqlite+aiosqlite:///{db_path}")
    bus = EventBus()
    rest = KalshiRestClient()
    books = {}
    agent = MarketDiscoveryAgent(bus=bus, rest_client=rest, db=db, books=books)
    try:
        discovered = await agent.run_scan_once()
        print(f"Discovered: {discovered}")
        print(f"Known tickers: {len(agent.known_tickers)}")
        print(f"Books count: {len(books)}")
        for t, b in list(books.items())[:5]:
            snap = b.get_snapshot()
            print(f"Book {t}: bid={snap.best_yes_bid} ask={snap.best_yes_ask} spread={snap.spread}")
    finally:
        await rest.close()

asyncio.run(main())
