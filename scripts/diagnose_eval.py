import asyncio
import os
from boi.db import Database, MarketRecord, ForecastRecord
from boi.agents.cio import ChiefInvestmentOfficerAgent
from boi.config import get_settings
from sqlalchemy import select

async def main():
    db_path = "backend/data/boi.db" if os.path.exists("backend/data/boi.db") else "data/boi.db"
    db = Database(f"sqlite+aiosqlite:///{db_path}")
    async with db.session() as s:
        res = await s.execute(select(MarketRecord))
        markets = list(res.scalars().all())
        f_res = await s.execute(select(ForecastRecord))
        forecasts = list(f_res.scalars().all())
    print(f"Total markets in DB: {len(markets)}")
    print(f"Total forecasts in DB: {len(forecasts)}")
    for f in forecasts[:5]:
        print(f"Forecast: {f.ticker} | P(YES)={f.p_yes} [{f.p_low}, {f.p_high}] | Model={f.model}")

asyncio.run(main())
