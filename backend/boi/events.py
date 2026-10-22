"""Typed in-process event bus with durable persistence and UI fan-out.

Agents never call each other directly; they publish typed events and subscribe to the types they
need. Persisted event types are written (batched) to the append-only ``events`` table.
"""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .db import Database, EventRecord, to_jsonable, utcnow

log = logging.getLogger("boi.bus")

# Event type constants (shared data contract)
MARKET_DISCOVERED = "market.discovered"
MARKET_UPDATED = "market.updated"  # metadata/status change
MARKET_LIFECYCLE = "market.lifecycle"
BOOK_UPDATED = "book.updated"  # top-of-book changed
BOOK_STALE = "book.stale"
TRADE_PRINT = "trade.print"
FEED_STATUS = "feed.status"
EXTERNAL_UPDATE = "external.update"
FORECAST_UPDATED = "forecast.updated"
SIGNAL_EVALUATED = "signal.evaluated"
RISK_DECISION = "risk.decision"
RECOMMENDATION_ISSUED = "recommendation.issued"
RECOMMENDATION_INVALIDATED = "recommendation.invalidated"
ORDER_UPDATE = "order.update"
FILL = "fill"
POSITION_UPDATE = "position.update"
ALERT = "alert"
AGENT_LOG = "agent.log"
SAFETY_HALT = "safety.halt"
BEHAVIOR_FLAG = "behavior.flag"
UI_TICKS = "ui.ticks"

PERSISTED_TYPES = {
    MARKET_DISCOVERED, MARKET_LIFECYCLE, FEED_STATUS, FORECAST_UPDATED, RISK_DECISION,
    RECOMMENDATION_ISSUED, RECOMMENDATION_INVALIDATED, ORDER_UPDATE, FILL, ALERT, SAFETY_HALT,
    BEHAVIOR_FLAG,
}


@dataclass
class Event:
    type: str
    source: str
    payload: dict[str, Any]
    ticker: str | None = None
    ts: datetime = field(default_factory=utcnow)

    def to_dict(self) -> dict:
        return {"type": self.type, "source": self.source, "ticker": self.ticker, "ts": self.ts.isoformat(),
                "payload": to_jsonable(self.payload)}


Handler = Callable[[Event], Awaitable[None]]


class EventBus:
    def __init__(self, db: Database | None = None):
        self.db = db
        self._subs: dict[str, list[Handler]] = defaultdict(list)
        self._persist_q: asyncio.Queue[Event] = asyncio.Queue(maxsize=50_000)
        self._ui_queues: set[asyncio.Queue] = set()
        self.recent: deque[dict] = deque(maxlen=500)
        self.counts: dict[str, int] = defaultdict(int)
        self._writer: asyncio.Task | None = None

    def subscribe(self, event_type: str, handler: Handler) -> None:
        self._subs[event_type].append(handler)

    async def publish(self, event: Event) -> None:
        self.counts[event.type] += 1
        handlers = self._subs.get(event.type, []) + self._subs.get("*", [])
        for h in handlers:
            try:
                await h(event)
            except Exception:  # one faulty agent must not break the bus
                log.exception("handler %s failed for %s", getattr(h, "__qualname__", h), event.type)
        if event.type in PERSISTED_TYPES:
            self.recent.append(event.to_dict())
            if self.db is not None:
                try:
                    self._persist_q.put_nowait(event)
                except asyncio.QueueFull:
                    log.error("persist queue full; dropping %s", event.type)
        if event.type != BOOK_UPDATED:  # raw book deltas are batched by the monitor agent (UI_TICKS)
            self._fanout(event)

    def _fanout(self, event: Event) -> None:
        if not self._ui_queues:
            return
        d = event.to_dict()
        for q in list(self._ui_queues):
            try:
                q.put_nowait(d)
            except asyncio.QueueFull:
                pass  # slow client; UI re-syncs via REST

    def ui_subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=2000)
        self._ui_queues.add(q)
        return q

    def ui_unsubscribe(self, q: asyncio.Queue) -> None:
        self._ui_queues.discard(q)

    def start(self) -> None:
        if self.db is not None and self._writer is None:
            self._writer = asyncio.create_task(self._writer_loop(), name="event-writer")

    async def stop(self) -> None:
        if self._writer:
            self._writer.cancel()
            try:
                await self._writer
            except asyncio.CancelledError:
                pass
            self._writer = None
        await self._flush_all()

    async def _flush_all(self) -> None:
        batch = []
        while not self._persist_q.empty():
            batch.append(self._persist_q.get_nowait())
        if batch:
            await self._write(batch)

    async def _writer_loop(self) -> None:
        while True:
            ev = await self._persist_q.get()
            batch = [ev]
            while not self._persist_q.empty() and len(batch) < 500:
                batch.append(self._persist_q.get_nowait())
            try:
                await self._write(batch)
            except Exception:
                log.exception("event persistence failed (%d events)", len(batch))
                await asyncio.sleep(1)

    async def _write(self, batch: list[Event]) -> None:
        assert self.db is not None
        async with self.db.session() as s:
            s.add_all([EventRecord(ts=e.ts, type=e.type, source=e.source, ticker=e.ticker,
                                   payload=to_jsonable(e.payload)) for e in batch])
            await s.commit()
