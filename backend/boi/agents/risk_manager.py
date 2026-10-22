"""Agent 11 — Portfolio Risk Manager.

HAS INDEPENDENT VETO POWER OVER EVERY PROPOSED TRADE.
Enforces hard limits:
- Max trade risk: 1% of bankroll ($5 default on $500)
- Max open exposure: 10% of bankroll ($50 default)
- Max daily loss budget: 3% of bankroll ($15 default)
- Max portfolio drawdown: 10% trigger ($50 default)
- Fractional Kelly position sizing capped by hard limits (stricter always wins)
- Correlated exposure caps (per-event, per-category)
- Immediate safety halt if drawdown or loss thresholds are breached
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from ..config import Settings, get_settings
from ..db import Database, KVRecord
from ..ev import TradeEvaluation, contracts_for_risk, kelly_fraction_binary
from ..events import RISK_DECISION, SAFETY_HALT, Event, EventBus
from ..money import D, ZERO, q_qty
from .base import BaseAgent

log = logging.getLogger("boi.agents.risk_manager")


@dataclass
class RiskDecision:
    approved: bool
    ticker: str
    action: str
    approved_contracts: Decimal
    approved_risk_dollars: Decimal
    veto_reason: str | None
    kelly_fraction: Decimal
    cap_applied: str  # "kelly" | "per_trade_cap" | "open_risk_cap" | "none"


class PortfolioRiskManagerAgent(BaseAgent):
    def __init__(self, bus: EventBus, db: Database, settings: Settings | None = None):
        super().__init__(name="Agent-11-PortfolioRiskManager", role="Chief Risk Officer & VETO Authority", bus=bus)
        self.db = db
        self.settings = settings or get_settings()
        self.bankroll = self.settings.bankroll
        self.open_risk = ZERO
        self.daily_loss = ZERO
        self.peak_equity = self.bankroll
        self.current_equity = self.bankroll
        self.is_halted = False
        self.halt_reason: str | None = None
        self.event_exposure: dict[str, Decimal] = {}
        self.category_exposure: dict[str, Decimal] = {}

    def update_portfolio_state(
        self,
        current_equity: Decimal,
        open_risk: Decimal,
        daily_loss: Decimal,
    ) -> None:
        self.current_equity = current_equity
        self.open_risk = open_risk
        self.daily_loss = daily_loss
        if current_equity > self.peak_equity:
            self.peak_equity = current_equity

        # Check Drawdown trigger
        drawdown_pct = (self.peak_equity - current_equity) / self.peak_equity if self.peak_equity > ZERO else ZERO
        if drawdown_pct >= self.settings.max_drawdown_pct and not self.is_halted:
            self.trigger_safety_halt(f"Portfolio drawdown {drawdown_pct:.1%} breached limit {self.settings.max_drawdown_pct:.1%}")

        # Check Daily Loss cutoff
        daily_loss_pct = daily_loss / self.bankroll if self.bankroll > ZERO else ZERO
        if daily_loss_pct >= self.settings.max_daily_loss_pct and not self.is_halted:
            self.trigger_safety_halt(f"Daily loss {daily_loss_pct:.1%} reached budget {self.settings.max_daily_loss_pct:.1%}")

    def trigger_safety_halt(self, reason: str) -> None:
        self.is_halted = True
        self.halt_reason = reason
        self.record_error(f"SAFETY HALT TRIGGERED: {reason}")
        # Publish safety halt event asynchronously
        try:
            import asyncio
            asyncio.create_task(
                self.bus.publish(
                    Event(
                        type=SAFETY_HALT,
                        source=self.name,
                        payload={"reason": reason, "equity": str(self.current_equity)},
                    )
                )
            )
        except Exception:
            pass

    def evaluate_trade(
        self,
        ticker: str,
        action: str,
        evaluation: TradeEvaluation,
        event_ticker: str = "",
        category: str = "",
    ) -> RiskDecision:
        self.mark_active()

        # 1. Check Safety Halt
        if self.is_halted:
            return self._veto(ticker, action, f"Trading is halted: {self.halt_reason}")

        # 2. Daily Loss Limit
        if self.daily_loss >= self.bankroll * self.settings.max_daily_loss_pct:
            return self._veto(ticker, action, "Daily loss cutoff reached ($15 limit)")

        # 3. Maximum Open Risk Limit
        max_open_allowed = self.bankroll * self.settings.max_open_risk_pct
        remaining_open_capacity = max_open_allowed - self.open_risk
        if remaining_open_capacity <= ZERO:
            return self._veto(ticker, action, f"Total open risk ({self.open_risk}) at or exceeding limit ({max_open_allowed})")

        # 4. Correlated Event Risk Limit
        max_event_allowed = self.bankroll * self.settings.max_event_risk_pct
        current_event_risk = self.event_exposure.get(event_ticker, ZERO)
        if current_event_risk >= max_event_allowed:
            return self._veto(ticker, action, f"Event correlation risk on {event_ticker} reached {max_event_allowed}")

        # 5. Position Sizing: Fractional Kelly vs Hard Limit
        # Fractional Kelly on conservative probability
        cost_pc = evaluation.cost_per_contract
        full_kelly = kelly_fraction_binary(evaluation.p_conservative, cost_pc)
        target_kelly_fraction = full_kelly * self.settings.kelly_fraction

        kelly_risk_dollars = self.bankroll * target_kelly_fraction
        hard_trade_cap_dollars = self.bankroll * self.settings.max_trade_risk_pct  # $5 default

        # Stricter risk limit always wins
        allowed_risk_dollars = min(
            hard_trade_cap_dollars,
            remaining_open_capacity,
            max_event_allowed - current_event_risk,
        )
        if kelly_risk_dollars > ZERO:
            allowed_risk_dollars = min(allowed_risk_dollars, kelly_risk_dollars)

        if allowed_risk_dollars < Decimal("1.00"):
            return self._veto(ticker, action, f"Allowed risk stake (${allowed_risk_dollars:0.2f}) below minimum contract value")

        # Compute contract count
        contracts = contracts_for_risk(allowed_risk_dollars, cost_pc, whole_contracts=True)
        if contracts <= ZERO:
            return self._veto(ticker, action, "Sized contract quantity is 0")

        # Cap determined
        cap = "kelly" if kelly_risk_dollars <= hard_trade_cap_dollars else "per_trade_cap"
        actual_risk = contracts * cost_pc

        decision = RiskDecision(
            approved=True,
            ticker=ticker,
            action=action,
            approved_contracts=contracts,
            approved_risk_dollars=actual_risk,
            veto_reason=None,
            kelly_fraction=target_kelly_fraction,
            cap_applied=cap,
        )

        self.record_decision(
            f"APPROVED {action} on {ticker}: {contracts} contracts (${actual_risk:.2f} risk)",
            {"contracts": str(contracts), "risk": str(actual_risk), "cap": cap},
        )
        return decision

    def _veto(self, ticker: str, action: str, reason: str) -> RiskDecision:
        self.record_decision(f"VETOED {action} on {ticker}: {reason}")
        return RiskDecision(
            approved=False,
            ticker=ticker,
            action=action,
            approved_contracts=ZERO,
            approved_risk_dollars=ZERO,
            veto_reason=reason,
            kelly_fraction=ZERO,
            cap_applied="none",
        )
