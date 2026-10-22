"""Agent 2 — Live Market Monitor.

Monitors order book depth, executable bids/asks, spreads, and market latency.
Emits batched UI ticks and flags stale feeds.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from decimal import Decimal

from ..config import Settings, get_settings
from ..db import Database, MarketTick
from ..events import BOOK_STALE, UI_TICKS, Event, EventBus
from ..kalshi.client import KalshiRestClient
from ..money import q_price
from ..orderbook import MarketOrderBook
from .base import BaseAgent

log = logging.getLogger("boi.agents.monitor")


class LiveMarketMonitorAgent(BaseAgent):
    def __init__(
        self,
        bus: EventBus,
        rest_client: KalshiRestClient,
        db: Database,
        books: dict[str, MarketOrderBook],
        settings: Settings | None = None,
    ):
        super().__init__(name="Agent-02-LiveMarketMonitor", role="Microstructure & Feed Monitor", bus=bus)
        self.rest = rest_client
        self.db = db
        self.books = books
        self.settings = settings or get_settings()
        self._running = False
        self._poll_task: asyncio.Task | None = None
        self._ui_batch_task: asyncio.Task | None = None

    def start(self) -> None:
        if self._poll_task is None:
            self._running = True
            self._poll_task = asyncio.create_task(self._poll_loop(), name="market-monitor-poll")
            self._ui_batch_task = asyncio.create_task(self._ui_tick_loop(), name="market-monitor-ui")

    async def stop(self) -> None:
        self._running = False
        for t in (self._poll_task, self._ui_batch_task):
            if t:
                t.cancel()
                try:
                    await t
                except asyncio.CancelledError:
                    pass
        self._poll_task = None
        self._ui_batch_task = None

    async def refresh_single_book(self, ticker: str) -> None:
        """Poll orderbook via REST for single market."""
        book = self.books.get(ticker)
        if not book:
            return
        try:
            raw = await self.rest.get_market_orderbook(ticker, depth=30)
            ob = raw.get("orderbook", {}) or raw.get("orderbook_fp", {})
            yes_raw = ob.get("yes_dollars_fp", []) or ob.get("yes", [])
            no_raw = ob.get("no_dollars_fp", []) or ob.get("no", [])
            book.apply_snapshot(
                yes_bids_raw=yes_raw,
                no_bids_raw=no_raw,
                seq=0,
                source_ts=datetime.now(UTC),
                transport="rest_poll",
            )
        except Exception as e:
            log.debug("REST orderbook refresh failed for %s: %s", ticker, e)

    async def _poll_loop(self) -> None:
        """Periodic REST refresh across tracked markets when WS is unauthenticated or auxiliary."""
        while self._running:
            self.mark_active()
            tickers = list(self.books.keys())
            if tickers:
                # Sample or batch through tracked markets
                for ticker in tickers[:40]:  # stay well within token bucket
                    if not self._running:
                        break
                    await self.refresh_single_book(ticker)
                    await asyncio.sleep(0.3)
                self.record_decision(f"Order Book Monitor: Active | Polled {min(40, len(tickers))} books")
            else:
                self.record_decision("Order Book Monitor: Active | Monitoring order book synchronizer")
            await asyncio.sleep(15.0)

    async def _ui_tick_loop(self) -> None:
        """Broadcast throttled top-of-book updates to UI stream every 1 second."""
        while self._running:
            await asyncio.sleep(1.0)
            if not self.books:
                continue

            ticks = []
            now = datetime.now(UTC)
            for ticker, book in list(self.books.items()):
                snap = book.get_snapshot(max_age_sec=self.settings.max_rest_book_age_sec)
                if snap.is_stale:
                    continue
                ticks.append({
                    "ticker": ticker,
                    "best_yes_bid": str(snap.best_yes_bid) if snap.best_yes_bid else None,
                    "best_yes_ask": str(snap.best_yes_ask) if snap.best_yes_ask else None,
                    "spread": str(snap.spread) if snap.spread else None,
                    "mid_price": str(snap.mid_price) if snap.mid_price else None,
                    "transport": snap.transport,
                    "updated_utc": snap.last_updated_utc.isoformat(),
                })

            if ticks:
                await self.bus.publish(
                    Event(
                        type=UI_TICKS,
                        source=self.name,
                        payload={"ticks": ticks, "count": len(ticks)},
                    )
                )
                self.record_decision(f"Dispatched {len(ticks)} live book ticks to UI stream")
