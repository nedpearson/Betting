"""Feed/provider health tracking shared by every data source."""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum


class FeedState(StrEnum):
    CONNECTED = "CONNECTED"
    DEGRADED = "DEGRADED"
    STALE = "STALE"
    DISCONNECTED = "DISCONNECTED"
    NOT_CONFIGURED = "NOT_CONFIGURED"


@dataclass
class FeedHealth:
    name: str
    description: str
    stale_after_sec: float
    transport: str = "rest"  # rest | ws | rest_poll
    configured: bool = True
    connected: bool = False
    last_update_mono: float | None = None
    last_update_utc: datetime | None = None
    last_source_ts: datetime | None = None
    last_error: str | None = None
    last_error_utc: datetime | None = None
    errors_total: int = 0
    messages_total: int = 0
    latencies_ms: deque = field(default_factory=lambda: deque(maxlen=200))
    recent_results: deque = field(default_factory=lambda: deque(maxlen=50))  # True=ok
    licensing_note: str = ""
    settlement_grade: bool = False  # True only if this IS the contract's settlement source

    def mark_ok(self, source_ts: datetime | None = None, latency_ms: float | None = None) -> None:
        self.connected = True
        self.last_update_mono = time.monotonic()
        self.last_update_utc = datetime.now(UTC)
        self.messages_total += 1
        self.recent_results.append(True)
        if source_ts is not None:
            self.last_source_ts = source_ts
            if latency_ms is None:
                latency_ms = (self.last_update_utc - source_ts).total_seconds() * 1000
        if latency_ms is not None:
            self.latencies_ms.append(latency_ms)

    def mark_error(self, err: str) -> None:
        self.errors_total += 1
        self.last_error = err[:500]
        self.last_error_utc = datetime.now(UTC)
        self.recent_results.append(False)

    def mark_disconnected(self, err: str | None = None) -> None:
        self.connected = False
        if err:
            self.mark_error(err)

    @property
    def age_sec(self) -> float | None:
        if self.last_update_mono is None:
            return None
        return time.monotonic() - self.last_update_mono

    @property
    def reliability(self) -> float:
        if not self.recent_results:
            return 0.0
        return sum(1 for r in self.recent_results if r) / len(self.recent_results)

    @property
    def state(self) -> FeedState:
        if not self.configured:
            return FeedState.NOT_CONFIGURED
        if not self.connected or self.last_update_mono is None:
            return FeedState.DISCONNECTED
        age = self.age_sec or 0.0
        if age > self.stale_after_sec:
            return FeedState.STALE
        if self.reliability < 0.8:
            return FeedState.DEGRADED
        return FeedState.CONNECTED

    @property
    def is_fresh(self) -> bool:
        return self.state in (FeedState.CONNECTED, FeedState.DEGRADED)

    def snapshot(self) -> dict:
        lat = sorted(self.latencies_ms)
        return {
            "name": self.name,
            "description": self.description,
            "state": self.state.value,
            "transport": self.transport,
            "age_sec": round(self.age_sec, 3) if self.age_sec is not None else None,
            "stale_after_sec": self.stale_after_sec,
            "last_update_utc": self.last_update_utc.isoformat() if self.last_update_utc else None,
            "last_source_ts": self.last_source_ts.isoformat() if self.last_source_ts else None,
            "latency_ms_p50": round(lat[len(lat) // 2], 1) if lat else None,
            "latency_ms_p95": round(lat[int(len(lat) * 0.95) - 1], 1) if len(lat) >= 2 else None,
            "reliability": round(self.reliability, 3),
            "messages_total": self.messages_total,
            "errors_total": self.errors_total,
            "last_error": self.last_error,
            "last_error_utc": self.last_error_utc.isoformat() if self.last_error_utc else None,
            "licensing_note": self.licensing_note,
            "settlement_grade": self.settlement_grade,
        }


class HealthRegistry:
    def __init__(self) -> None:
        self.feeds: dict[str, FeedHealth] = {}

    def register(self, feed: FeedHealth) -> FeedHealth:
        self.feeds[feed.name] = feed
        return feed

    def get(self, name: str) -> FeedHealth | None:
        return self.feeds.get(name)

    def snapshot(self) -> list[dict]:
        return [f.snapshot() for f in self.feeds.values()]
