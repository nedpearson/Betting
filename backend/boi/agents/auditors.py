"""Agents 13, 14, and 15: Model Validation, Behavioral Risk, and System Reliability.

Agent 13: Model Validation (calibration error, Brier score, drift detection)
Agent 14: Behavioral Risk Analyst (cooldowns, loss chasing, trade frequency caps)
Agent 15: System Reliability (health monitor, stale feed detection, connection watchdog)
"""

from __future__ import annotations

import logging
import time
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select

from ..config import Settings, get_settings
from ..db import Database, ForecastRecord, SettlementRecord
from ..events import BEHAVIOR_FLAG, FEED_STATUS, Event, EventBus
from ..health import HealthRegistry
from ..stats import brier, expected_calibration_error, log_loss
from .base import BaseAgent

log = logging.getLogger("boi.agents.auditors")


class ModelValidationAgent(BaseAgent):
    def __init__(self, bus: EventBus, db: Database):
        super().__init__(name="Agent-13-ModelValidation", role="Quantitative Auditor & Calibration Monitor", bus=bus)
        self.db = db

    async def run_calibration_audit(self) -> dict:
        self.mark_active()
        async with self.db.session() as s:
            stmt = select(ForecastRecord).where(ForecastRecord.resolved_outcome.isnot(None))
            res = await s.execute(stmt)
            resolved = list(res.scalars().all())

        if not resolved:
            self.record_decision("Audit: No resolved forecasts in database yet")
            return {"count": 0, "status": "insufficient_data"}

        probs = [f.p_yes for f in resolved]
        outcomes = [f.resolved_outcome for f in resolved if f.resolved_outcome is not None]

        bs = brier(probs, outcomes)
        ll = log_loss(probs, outcomes)
        ece = expected_calibration_error(probs, outcomes)

        metrics = {
            "resolved_count": len(resolved),
            "brier_score": round(bs, 4),
            "log_loss": round(ll, 4),
            "expected_calibration_error": round(ece, 4),
            "status": "calibrated" if bs < 0.25 else "degraded",
        }
        self.record_decision(f"Calibration audit: N={len(resolved)}, Brier={bs:.4f}, ECE={ece:.4f}", metrics)
        return metrics


class BehavioralRiskAgent(BaseAgent):
    def __init__(self, bus: EventBus, settings: Settings | None = None):
        super().__init__(name="Agent-14-BehavioralRisk", role="Behavioral Discipline & Risk Monitor", bus=bus)
        self.settings = settings or get_settings()
        self.last_loss_time_mono: float | None = None
        self.daily_trade_count: int = 0
        self.last_trade_size_dollars: Decimal = Decimal("0")

    def record_loss(self) -> None:
        self.last_loss_time_mono = time.monotonic()
        self.record_decision("Recorded loss; cooldown active for 30 minutes")

    def can_trade(self, requested_risk: Decimal) -> tuple[bool, str | None]:
        self.mark_active()
        # 1. Cooldown check after loss
        if self.last_loss_time_mono is not None:
            elapsed = time.monotonic() - self.last_loss_time_mono
            if elapsed < self.settings.trade_cooldown_after_loss_sec:
                rem_mins = int((self.settings.trade_cooldown_after_loss_sec - elapsed) / 60)
                reason = f"Loss cooldown active ({rem_mins}m remaining). Prevents revenge trading."
                self.record_decision(f"BLOCKED: {reason}")
                return False, reason

        # 2. Daily frequency limit
        if self.daily_trade_count >= self.settings.max_trades_per_day:
            reason = f"Daily trade limit ({self.settings.max_trades_per_day}) reached."
            self.record_decision(f"BLOCKED: {reason}")
            return False, reason

        # 3. Prevent doubling down (martingale protection)
        if self.last_loss_time_mono is not None and self.last_trade_size_dollars > Decimal("0"):
            if requested_risk > self.last_trade_size_dollars * Decimal("1.2"):
                reason = "Size escalation after loss detected (martingale / loss-chasing protection)."
                self.record_decision(f"BLOCKED: {reason}")
                return False, reason

        return True, None

    def record_trade_executed(self, risk: Decimal) -> None:
        self.daily_trade_count += 1
        self.last_trade_size_dollars = risk
        self.record_decision(f"Trade #{self.daily_trade_count} recorded (risk: ${risk:.2f})")


class SystemReliabilityAgent(BaseAgent):
    def __init__(self, bus: EventBus, health_registry: HealthRegistry):
        super().__init__(name="Agent-15-SystemReliability", role="Infrastructure & Feed Health Sentry", bus=bus)
        self.registry = health_registry

    def audit_system_health(self) -> dict:
        self.mark_active()
        snapshots = self.registry.snapshot()
        disconnected = [f for f in snapshots if f["state"] == "DISCONNECTED"]
        stale = [f for f in snapshots if f["state"] == "STALE"]

        overall = "HEALTHY"
        if disconnected:
            overall = "DEGRADED"
        if stale:
            overall = "WARNING"

        status = {
            "overall_status": overall,
            "total_feeds": len(snapshots),
            "disconnected_feeds": [f["name"] for f in disconnected],
            "stale_feeds": [f["name"] for f in stale],
            "feeds": snapshots,
        }
        self.record_decision(f"Health Audit: {overall} ({len(snapshots)} feeds monitored)", status)
        return status
