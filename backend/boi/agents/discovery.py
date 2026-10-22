"""Agent 1 — Market Discovery.

Continuously scans Kalshi for active and newly listed markets.
Extracts title, event details, price ranges, tick sizes, fee models, and settlement criteria.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from ..config import Settings, get_settings
from ..db import Database, MarketRecord
from ..events import MARKET_DISCOVERED, Event, EventBus
from ..kalshi.client import KalshiRestClient
from ..money import PriceGrid
from ..orderbook import MarketOrderBook
from .base import BaseAgent

log = logging.getLogger("boi.agents.discovery")


class MarketDiscoveryAgent(BaseAgent):
    def __init__(
        self,
        bus: EventBus,
        rest_client: KalshiRestClient,
        db: Database,
        books: dict[str, MarketOrderBook],
        settings: Settings | None = None,
    ):
        super().__init__(name="Agent-01-MarketDiscovery", role="Market Discovery Specialist", bus=bus)
        self.rest = rest_client
        self.db = db
        self.books = books
        self.settings = settings or get_settings()
        self.known_tickers: set[str] = set()
        self._running = False
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        if self._task is None:
            self._running = True
            self._task = asyncio.create_task(self._scan_loop(), name="market-discovery")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def run_scan_once(self) -> int:
        self.mark_active()
        prefixes = self.settings.series_prefixes
        discovered = 0
        try:
            # Query open markets, excluding combo multivariate markets
            resp = await self.rest.get_markets(status="open", limit=1000, mve_filter="exclude")
            raw_markets = resp.get("markets", [])
            log.info("MarketDiscovery received %d open markets from Kalshi", len(raw_markets))

            records_to_save: list[MarketRecord] = []
            for m in raw_markets:
                ticker = m.get("ticker")
                if not ticker:
                    continue

                event_ticker = m.get("event_ticker", "")
                series_ticker = event_ticker.split("-")[0] if "-" in event_ticker else event_ticker

                # Check if matches enabled prefixes
                if prefixes and not any(series_ticker.startswith(p) for p in prefixes):
                    continue

                if len(self.known_tickers) >= self.settings.max_tracked_markets and ticker not in self.known_tickers:
                    continue

                is_new = ticker not in self.known_tickers
                self.known_tickers.add(ticker)

                # Initialize or update OrderBook PriceGrid
                price_ranges = m.get("price_ranges", [])
                grid = PriceGrid.from_api(price_ranges)
                if ticker not in self.books:
                    self.books[ticker] = MarketOrderBook(ticker=ticker, grid=grid)

                # Parse close time
                close_time_raw = m.get("close_time") or m.get("expiration_time")
                close_time = None
                if close_time_raw:
                    try:
                        close_time = datetime.fromisoformat(close_time_raw.replace("Z", "+00:00"))
                    except Exception:
                        pass

                rec = MarketRecord(
                    ticker=ticker,
                    event_ticker=event_ticker,
                    series_ticker=series_ticker,
                    category=m.get("category"),
                    title=m.get("title", ""),
                    yes_sub_title=m.get("yes_sub_title"),
                    status=m.get("status", "open"),
                    close_time=close_time,
                    result=m.get("result"),
                    raw=m,
                    updated_at=datetime.now(UTC),
                )
                records_to_save.append(rec)

                if is_new:
                    discovered += 1
                    await self.bus.publish(
                        Event(
                            type=MARKET_DISCOVERED,
                            source=self.name,
                            ticker=ticker,
                            payload={
                                "ticker": ticker,
                                "event_ticker": event_ticker,
                                "series_ticker": series_ticker,
                                "title": rec.title,
                                "yes_sub_title": rec.yes_sub_title,
                                "close_time": close_time.isoformat() if close_time else None,
                                "strike_type": m.get("strike_type"),
                                "floor_strike": m.get("floor_strike"),
                                "cap_strike": m.get("cap_strike"),
                            },
                        )
                    )

            if records_to_save:
                async with self.db.session() as s:
                    for r in records_to_save:
                        await s.merge(r)
                    await s.commit()

            self.record_decision(
                f"Scanned {len(raw_markets)} markets; tracking {len(self.known_tickers)} (new: {discovered})"
            )
            return discovered
        except Exception as e:
            self.record_error(f"Market discovery scan error: {e}")
            return 0

    async def _scan_loop(self) -> None:
        while self._running:
            await self.run_scan_once()
            await asyncio.sleep(self.settings.discovery_interval_sec)
