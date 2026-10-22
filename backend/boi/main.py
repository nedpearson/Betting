"""Betting Intelligence OS — Main Application and CLI Entrypoint."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from contextlib import asynccontextmanager

import uvicorn

from .agents import AgentSystem
from .api import create_app
from .backtest import BacktestSimulator
from .config import Settings, get_settings
from .db import Database
from .events import EventBus
from .external.crypto import CryptoIntelligenceEngine
from .external.economic import EconomicIntelligenceEngine
from .external.news import NewsVerificationEngine
from .external.sports import SportsIntelligenceEngine
from .external.weather import WeatherIntelligenceEngine
from .health import HealthRegistry
from .kalshi.client import KalshiRestClient, KalshiWsClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("boi.main")


async def init_system(settings: Settings | None = None) -> tuple[AgentSystem, EventBus, Database, KalshiRestClient, HealthRegistry]:
    cfg = settings or get_settings()
    db = Database(cfg.database_url)
    await db.create_all()

    health_registry = HealthRegistry()
    bus = EventBus(db=db)
    bus.start()

    rest_client = KalshiRestClient(settings=cfg)
    health_registry.register(rest_client.health)

    weather_engine = WeatherIntelligenceEngine()
    health_registry.register(weather_engine.health)

    crypto_engine = CryptoIntelligenceEngine()
    health_registry.register(crypto_engine.health)

    sports_engine = SportsIntelligenceEngine()
    health_registry.register(sports_engine.health)

    economic_engine = EconomicIntelligenceEngine(settings=cfg)
    health_registry.register(economic_engine.health)

    news_engine = NewsVerificationEngine()
    health_registry.register(news_engine.health)

    agent_system = AgentSystem(
        bus=bus,
        db=db,
        rest_client=rest_client,
        health_registry=health_registry,
        weather_engine=weather_engine,
        crypto_engine=crypto_engine,
        sports_engine=sports_engine,
        economic_engine=economic_engine,
        news_engine=news_engine,
        settings=cfg,
    )

    # Optional WebSocket client if credentials exist
    if cfg.has_kalshi_credentials:
        ws_client = KalshiWsClient(
            books=agent_system.books,
            bus=bus,
            rest_client=rest_client,
            settings=cfg,
        )
        health_registry.register(ws_client.health)
        ws_client.start()

    return agent_system, bus, db, rest_client, health_registry


async def run_scan_cli(settings: Settings | None = None) -> None:
    cfg = settings or get_settings()
    print("=" * 70)
    print("BETTING INTELLIGENCE OS — QUANTITATIVE LIVE SCANNER")
    print("Exchange: Kalshi | Mode: " + cfg.execution_mode.value.upper())
    print("=" * 70)

    agent_system, bus, db, rest_client, health = await init_system(cfg)
    try:
        print("\n[Phase 1] Discovering live Kalshi markets...")
        discovered = await agent_system.discovery.run_scan_once()
        print(f"-> Discovered {len(agent_system.discovery.known_tickers)} eligible markets ({discovered} new).")

        print("\n[Phase 2] Refreshing market data & generating quantitative forecasts...")
        # Poll books and forecast first 15 tracked markets
        tickers = list(agent_system.books.keys())[:15]
        for t in tickers:
            await agent_system.monitor.refresh_single_book(t)
            async with db.session() as s:
                m_rec = await s.get(agent_system.discovery.db.session().kw.get("bind") or object, t) if False else None
            # Retrieve from DB
            from sqlalchemy import select
            from .db import MarketRecord
            async with db.session() as s:
                m_rec = (await s.execute(select(MarketRecord).where(MarketRecord.ticker == t))).scalar_one_or_none()
            if m_rec:
                await agent_system.forecaster.forecast_market(m_rec)

        print("\n[Phase 3] Evaluating microstructure, EV after fees, and risk bounds...")
        opportunities = await agent_system.cio.scan_and_rank_opportunities()

        print("\n" + "=" * 70)
        best = agent_system.cio.best_live_opportunity
        if best:
            p = best.payload
            print("BEST LIVE OPPORTUNITY:")
            print(f"  Market: {p['ticker']}")
            print(f"  Action: {p['action']} ({p['category']})")
            print(f"  Entry Price: ${p['entry_price']} | Max Entry: ${p['max_entry_price']}")
            print(f"  Estimated Probability: {float(p['estimated_probability']):.1%} (Cons: {float(p['conservative_probability']):.1%})")
            print(f"  Market Probability: {float(p['market_probability']):.1%}" if p.get('market_probability') else "  Market Probability: N/A")
            print(f"  Conservative Edge: +${float(p['conservative_edge']):0.4f}/contract")
            print(f"  Net Expected ROI: {float(p['net_roi']):.1%}")
            print(f"  Recommended Stake: ${float(p['recommended_stake']):0.2f} ({p['recommended_contracts']} contracts)")
            print(f"  Max Loss: ${p['max_loss']} | Max Profit: ${p['max_profit']}")
            print(f"  Reason: {p['evidence_summary']}")
        else:
            print("NO QUALIFIED TRADE AVAILABLE")
            print(f"Reason: {agent_system.cio.no_trade_reason}")
        print("=" * 70)

    finally:
        await bus.stop()
        await rest_client.close()
        await db.close()


def cli():
    parser = argparse.ArgumentParser(description="Betting Intelligence OS")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("scan", help="Run a live market scan and output best opportunity")
    serve_p = subparsers.add_parser("serve", help="Run the always-on server and web terminal")
    serve_p.add_argument("--port", type=int, default=8000)
    serve_p.add_argument("--host", type=str, default="127.0.0.1")

    args = parser.parse_args()
    settings = get_settings()

    if args.command == "scan":
        asyncio.run(run_scan_cli(settings))
    elif args.command == "serve":
        async def run_server():
            agent_system, bus, db, rest_client, health = await init_system(settings)
            agent_system.start()
            app = create_app(agent_system, bus, db, settings)
            config = uvicorn.Config(app, host=args.host, port=args.port, log_level="info")
            server = uvicorn.Server(config)
            print(f"Starting Betting Intelligence OS on http://{args.host}:{args.port}")
            try:
                await server.serve()
            finally:
                await agent_system.stop()
                await bus.stop()
                await rest_client.close()
                await db.close()

        asyncio.run(run_server())
    else:
        # Default to scan
        asyncio.run(run_scan_cli(settings))


if __name__ == "__main__":
    cli()
