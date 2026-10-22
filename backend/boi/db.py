"""Persistent storage (SQLAlchemy 2.x async). SQLite by default, Postgres via DATABASE_URL.

Money values are stored as TEXT decimal strings to preserve exactness across databases.
The ``events`` table is the append-only authoritative event log: every forecast, recommendation,
risk decision, order and fill is written there with provenance so any decision can be replayed.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(UTC)


def _json_default(o: Any):
    if isinstance(o, Decimal):
        return str(o)
    if isinstance(o, datetime):
        return o.isoformat()
    raise TypeError(f"not serializable: {type(o)}")


def to_jsonable(obj: Any) -> Any:
    return json.loads(json.dumps(obj, default=_json_default))


class Base(DeclarativeBase):
    pass


class EventRecord(Base):
    __tablename__ = "events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    type: Mapped[str] = mapped_column(String(64), index=True)
    source: Mapped[str] = mapped_column(String(64))
    ticker: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    payload: Mapped[dict] = mapped_column(JSON)


class MarketRecord(Base):
    __tablename__ = "markets"
    ticker: Mapped[str] = mapped_column(String(128), primary_key=True)
    event_ticker: Mapped[str] = mapped_column(String(128), index=True)
    series_ticker: Mapped[str] = mapped_column(String(64), index=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str] = mapped_column(Text)
    yes_sub_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32))
    close_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    result: Mapped[str | None] = mapped_column(String(16), nullable=True)
    raw: Mapped[dict] = mapped_column(JSON)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class MarketTick(Base):
    """Top-of-book observations, recorded for replay/backtest. Only real observed data."""

    __tablename__ = "market_ticks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(128))
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(16))  # ws | rest
    yes_bid: Mapped[str | None] = mapped_column(String(12), nullable=True)
    yes_ask: Mapped[str | None] = mapped_column(String(12), nullable=True)
    yes_bid_qty: Mapped[str | None] = mapped_column(String(16), nullable=True)
    yes_ask_qty: Mapped[str | None] = mapped_column(String(16), nullable=True)
    __table_args__ = (Index("ix_ticks_ticker_ts", "ticker", "ts"),)


class ForecastRecord(Base):
    __tablename__ = "forecasts"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    ticker: Mapped[str] = mapped_column(String(128), index=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    model: Mapped[str] = mapped_column(String(64))
    model_version: Mapped[str] = mapped_column(String(32))
    independence: Mapped[str] = mapped_column(String(24))  # independent | market_informed | baseline
    p_yes: Mapped[float] = mapped_column(Float)
    p_low: Mapped[float] = mapped_column(Float)
    p_high: Mapped[float] = mapped_column(Float)
    p_market: Mapped[float | None] = mapped_column(Float, nullable=True)
    inputs: Mapped[dict] = mapped_column(JSON)
    resolved_outcome: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1 yes, 0 no


class RecommendationRecord(Base):
    __tablename__ = "recommendations"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    ticker: Mapped[str] = mapped_column(String(128), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(16), index=True)  # active | expired | invalidated | superseded
    category: Mapped[str] = mapped_column(String(20))  # STRONG_CANDIDATE | CANDIDATE | WATCHLIST | NO_TRADE
    action: Mapped[str] = mapped_column(String(16))  # BUY_YES | BUY_NO | NO_TRADE
    payload: Mapped[dict] = mapped_column(JSON)
    forecast_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    invalidated_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    outcome: Mapped[int | None] = mapped_column(Integer, nullable=True)


class OrderRecord(Base):
    """Paper AND live orders. ``mode`` distinguishes them; they are never mixed in reporting."""

    __tablename__ = "orders"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    client_order_id: Mapped[str] = mapped_column(String(64))
    mode: Mapped[str] = mapped_column(String(8), index=True)  # paper | live
    ticker: Mapped[str] = mapped_column(String(128), index=True)
    side: Mapped[str] = mapped_column(String(4))  # yes | no
    action: Mapped[str] = mapped_column(String(4))  # buy | sell
    limit_price: Mapped[str] = mapped_column(String(12))
    count: Mapped[str] = mapped_column(String(16))
    filled: Mapped[str] = mapped_column(String(16), default="0")
    avg_fill_price: Mapped[str | None] = mapped_column(String(12), nullable=True)
    fees: Mapped[str] = mapped_column(String(16), default="0")
    status: Mapped[str] = mapped_column(String(16))  # pending | resting | executed | canceled | rejected
    recommendation_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    exchange_order_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    __table_args__ = (UniqueConstraint("mode", "client_order_id", name="uq_order_idem"),)


class FillRecord(Base):
    __tablename__ = "fills"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    order_id: Mapped[str] = mapped_column(String(40), index=True)
    mode: Mapped[str] = mapped_column(String(8), index=True)
    ticker: Mapped[str] = mapped_column(String(128), index=True)
    side: Mapped[str] = mapped_column(String(4))
    action: Mapped[str] = mapped_column(String(4))
    price: Mapped[str] = mapped_column(String(12))
    count: Mapped[str] = mapped_column(String(16))
    fee: Mapped[str] = mapped_column(String(16))
    is_taker: Mapped[bool] = mapped_column(Boolean, default=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class SettlementRecord(Base):
    __tablename__ = "settlements"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mode: Mapped[str] = mapped_column(String(8), index=True)
    ticker: Mapped[str] = mapped_column(String(128), index=True)
    result: Mapped[str] = mapped_column(String(8))
    yes_count: Mapped[str] = mapped_column(String(16))
    no_count: Mapped[str] = mapped_column(String(16))
    revenue: Mapped[str] = mapped_column(String(16))
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    __table_args__ = (UniqueConstraint("mode", "ticker", name="uq_settle"),)


class AlertRecord(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    kind: Mapped[str] = mapped_column(String(32))
    severity: Mapped[str] = mapped_column(String(8))
    title: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    ticker: Mapped[str | None] = mapped_column(String(128), nullable=True)
    dedupe_key: Mapped[str] = mapped_column(String(160), index=True)
    delivered: Mapped[dict] = mapped_column(JSON, default=dict)
    read: Mapped[bool] = mapped_column(Boolean, default=False)


class ExternalObservation(Base):
    """Raw external data snapshots with source timestamps — enables reproducible forecasts."""

    __tablename__ = "external_observations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    key: Mapped[str] = mapped_column(String(128), index=True)
    source_ts: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    payload: Mapped[dict] = mapped_column(JSON)


class KVRecord(Base):
    """Small mutable state (e.g. kill switch, peak equity, owner settings overrides)."""

    __tablename__ = "kv"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Database:
    def __init__(self, url: str):
        if url.startswith("sqlite") and ":///" in url:
            path = url.split(":///", 1)[1]
            if path and path != ":memory:":
                Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.engine: AsyncEngine = create_async_engine(url, future=True)
        self.session: async_sessionmaker[AsyncSession] = async_sessionmaker(self.engine, expire_on_commit=False)

    async def create_all(self) -> None:
        async with self.engine.begin() as conn:
            if self.engine.dialect.name == "sqlite":
                await conn.exec_driver_sql("PRAGMA journal_mode=WAL")
            await conn.run_sync(Base.metadata.create_all)

    async def ping(self) -> bool:
        try:
            async with self.engine.connect() as conn:
                await conn.exec_driver_sql("SELECT 1")
            return True
        except Exception:
            return False

    async def kv_get(self, key: str, default: Any = None) -> Any:
        async with self.session() as s:
            rec = await s.get(KVRecord, key)
            return rec.value.get("v", default) if rec else default

    async def kv_set(self, key: str, value: Any) -> None:
        async with self.session() as s:
            rec = await s.get(KVRecord, key)
            if rec:
                rec.value = {"v": to_jsonable(value)}
                rec.updated_at = utcnow()
            else:
                s.add(KVRecord(key=key, value={"v": to_jsonable(value)}))
            await s.commit()

    async def close(self) -> None:
        await self.engine.dispose()
