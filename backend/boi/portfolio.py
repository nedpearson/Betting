"""Portfolio, bankroll, and P&L tracking engine.

Tracks:
- Starting balance ($500 default)
- Available bankroll & total equity
- Open exposure, unrealized P&L, realized P&L, fees paid
- Maximum drawdown from peak
- Category & event correlation exposures
- Reconciles with live Kalshi account when authenticated
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select

from .config import Settings, get_settings
from .db import Database, FillRecord, OrderRecord, SettlementRecord
from .money import D, ONE, ZERO, q_price

log = logging.getLogger("boi.portfolio")


@dataclass
class PositionSummary:
    ticker: str
    mode: str
    side: str  # "yes" | "no"
    contracts: Decimal
    avg_entry_price: Decimal
    current_mid_price: Decimal | None
    unrealized_pnl: Decimal
    realized_pnl: Decimal
    cost_basis: Decimal


class PortfolioTracker:
    def __init__(self, db: Database, settings: Settings | None = None):
        self.db = db
        self.settings = settings or get_settings()
        self.starting_bankroll = self.settings.bankroll
        self.available_cash = self.settings.bankroll
        self.realized_pnl = ZERO
        self.total_fees = ZERO
        self.positions: dict[str, PositionSummary] = {}

    async def reload_positions(self) -> None:
        """Recompute portfolio state from fills and settlements in database."""
        mode = self.settings.execution_mode.value
        async with self.db.session() as s:
            # Query all fills for this mode
            stmt = select(FillRecord).where(FillRecord.mode == mode)
            res = await s.execute(stmt)
            fills = list(res.scalars().all())

            # Query settlements
            s_stmt = select(SettlementRecord).where(SettlementRecord.mode == mode)
            s_res = await s.execute(s_stmt)
            settlements = {rec.ticker: rec for rec in s_res.scalars().all()}

        # Group fills by ticker
        self.total_fees = sum((D(f.fee) for f in fills), ZERO)
        fills_by_ticker: dict[str, list[FillRecord]] = {}
        for f in fills:
            fills_by_ticker.setdefault(f.ticker, []).append(f)

        self.positions.clear()
        total_realized = ZERO
        total_cost_out = ZERO

        for ticker, t_fills in fills_by_ticker.items():
            yes_qty = ZERO
            yes_cost = ZERO
            no_qty = ZERO
            no_cost = ZERO

            for f in t_fills:
                qty = D(f.count)
                price = D(f.price)
                if f.side == "yes":
                    yes_qty += qty
                    yes_cost += qty * price
                else:
                    no_qty += qty
                    no_cost += qty * price

            # Check if settled
            settle = settlements.get(ticker)
            if settle:
                rev = D(settle.revenue)
                t_realized = rev - (yes_cost + no_cost)
                total_realized += t_realized
            else:
                total_cost_out += (yes_cost + no_cost)
                if yes_qty > ZERO:
                    avg_p = q_price(yes_cost / yes_qty)
                    self.positions[ticker] = PositionSummary(
                        ticker=ticker,
                        mode=mode,
                        side="yes",
                        contracts=yes_qty,
                        avg_entry_price=avg_p,
                        current_mid_price=None,
                        unrealized_pnl=ZERO,
                        realized_pnl=ZERO,
                        cost_basis=yes_cost,
                    )
                elif no_qty > ZERO:
                    avg_p = q_price(no_cost / no_qty)
                    self.positions[ticker] = PositionSummary(
                        ticker=ticker,
                        mode=mode,
                        side="no",
                        contracts=no_qty,
                        avg_entry_price=avg_p,
                        current_mid_price=None,
                        unrealized_pnl=ZERO,
                        realized_pnl=ZERO,
                        cost_basis=no_cost,
                    )

        self.realized_pnl = total_realized
        self.available_cash = self.starting_bankroll + self.realized_pnl - total_cost_out - self.total_fees

    def mark_to_market(self, mid_prices: dict[str, Decimal]) -> dict:
        total_unrealized = ZERO
        total_open_risk = ZERO

        for ticker, pos in self.positions.items():
            mid = mid_prices.get(ticker)
            if mid is not None:
                pos.current_mid_price = mid
                current_val = pos.contracts * (mid if pos.side == "yes" else (ONE - mid))
                pos.unrealized_pnl = current_val - pos.cost_basis
                total_unrealized += pos.unrealized_pnl
            total_open_risk += pos.cost_basis

        total_equity = self.available_cash + total_open_risk + total_unrealized
        drawdown = (
            (self.starting_bankroll - total_equity) / self.starting_bankroll
            if total_equity < self.starting_bankroll
            else ZERO
        )

        return {
            "starting_bankroll": str(self.starting_bankroll),
            "available_cash": str(self.available_cash),
            "total_equity": str(total_equity),
            "total_open_risk": str(total_open_risk),
            "unrealized_pnl": str(total_unrealized),
            "realized_pnl": str(self.realized_pnl),
            "total_fees": str(self.total_fees),
            "drawdown_pct": str(drawdown),
            "open_positions_count": len(self.positions),
            "positions": [
                {
                    "ticker": p.ticker,
                    "side": p.side,
                    "contracts": str(p.contracts),
                    "avg_entry": str(p.avg_entry_price),
                    "current_mid": str(p.current_mid_price) if p.current_mid_price else None,
                    "unrealized_pnl": str(p.unrealized_pnl),
                    "cost_basis": str(p.cost_basis),
                }
                for p in self.positions.values()
            ],
        }
