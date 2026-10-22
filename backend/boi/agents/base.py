"""Base class for all 16 specialized agents in Betting Intelligence OS."""

from __future__ import annotations

import logging
from collections import deque
from datetime import UTC, datetime
from typing import Any

from ..events import AGENT_LOG, Event, EventBus

log = logging.getLogger("boi.agents")


class BaseAgent:
    def __init__(self, name: str, role: str, bus: EventBus):
        self.name = name
        self.role = role
        self.bus = bus
        self.status: str = "INITIALIZING"  # ACTIVE | IDLE | DEGRADED | ERROR
        self.last_active_utc: datetime = datetime.now(UTC)
        self.decisions_count: int = 0
        self.errors_count: int = 0
        self.last_error: str | None = None
        self.recent_logs: deque[dict[str, Any]] = deque(maxlen=50)

    def record_decision(self, summary: str, details: dict | None = None) -> None:
        self.decisions_count += 1
        self.last_active_utc = datetime.now(UTC)
        entry = {
            "ts": self.last_active_utc.isoformat(),
            "summary": summary,
            "details": details or {},
        }
        self.recent_logs.append(entry)

    def record_error(self, err: str) -> None:
        self.errors_count += 1
        self.last_error = err[:400]
        self.last_active_utc = datetime.now(UTC)
        self.recent_logs.append({
            "ts": self.last_active_utc.isoformat(),
            "error": self.last_error,
        })
        log.error("[%s] %s", self.name, err)

    def mark_active(self) -> None:
        self.status = "ACTIVE"
        self.last_active_utc = datetime.now(UTC)

    def snapshot(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "role": self.role,
            "status": self.status,
            "last_active_utc": self.last_active_utc.isoformat(),
            "decisions_count": self.decisions_count,
            "errors_count": self.errors_count,
            "last_error": self.last_error,
            "recent_logs": list(self.recent_logs)[-10:],
        }
