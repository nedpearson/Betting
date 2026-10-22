"""Agent 10 — Expected Value Analyst.

Computes net expected return after fees, spreads, and slippage.
Rejects trades without a statistically defensible conservative edge.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from decimal import Decimal

from ..config import Settings, get_settings
from ..db import ForecastRecord
from ..ev import Level, TradeEvaluation, evaluate_buy, max_entry_price
from ..events import SIGNAL_EVALUATED, Event, EventBus
from ..fees import default_fee_fn
from ..money import D, ONE, ZERO
from ..orderbook import MarketOrderBook
from .base import BaseAgent

log = logging.getLogger("boi.agents.ev_analyst")


@dataclass
class TradeSignal:
    ticker: str
    action: str  # BUY_YES | BUY_NO | NO_TRADE
    evaluation: TradeEvaluation | None
    max_entry_price: Decimal | None
    rejection_reason: str | None
    forecast: ForecastRecord


class ExpectedValueAnalystAgent(BaseAgent):
    def __init__(self, bus: EventBus, books: dict[str, MarketOrderBook], settings: Settings | None = None):
        super().__init__(name="Agent-10-ExpectedValueAnalyst", role="Quantitative EV & Margin Analyst", bus=bus)
        self.books = books
        self.settings = settings or get_settings()
        self._running = False
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        if self._task is None:
            self._running = True
            self._task = asyncio.create_task(self._ev_loop(), name="ev-analyst-agent")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _ev_loop(self) -> None:
        while self._running:
            self.mark_active()
            books_count = len(self.books)
            self.record_decision(
                f"EV & Margin Engine active: monitoring {books_count} order books | Quadratic taker fee deduction enabled (7% * C * P * (1-P))",
                {"monitored_books": books_count},
            )
            await asyncio.sleep(12.0)

    def evaluate_market(self, forecast: ForecastRecord, base_contracts: Decimal = Decimal("10")) -> TradeSignal:
        self.mark_active()
        ticker = forecast.ticker
        book = self.books.get(ticker)
        if not book:
            return TradeSignal(
                ticker=ticker,
                action="NO_TRADE",
                evaluation=None,
                max_entry_price=None,
                rejection_reason="No orderbook available",
                forecast=forecast,
            )

        snap = book.get_snapshot(max_age_sec=self.settings.max_rest_book_age_sec)
        if snap.is_stale:
            return TradeSignal(
                ticker=ticker,
                action="NO_TRADE",
                evaluation=None,
                max_entry_price=None,
                rejection_reason="Orderbook is stale",
                forecast=forecast,
            )

        p_yes = D(forecast.p_yes)
        p_yes_low = D(forecast.p_low)
        p_no = ONE - p_yes
        p_no_low = ONE - D(forecast.p_high)
        p_market = D(forecast.p_market) if forecast.p_market is not None else None

        # 1. Evaluate BUY YES
        eval_yes = evaluate_buy(
            side="yes",
            p_side=p_yes,
            p_side_low=p_yes_low,
            asks=snap.yes_asks,
            contracts=base_contracts,
            fee_fn=default_fee_fn,
            slippage_buffer=Decimal("0.005"),
            p_market=p_market,
        )

        # 2. Evaluate BUY NO
        p_market_no = (ONE - p_market) if p_market is not None else None
        eval_no = evaluate_buy(
            side="no",
            p_side=p_no,
            p_side_low=p_no_low,
            asks=snap.no_asks,
            contracts=base_contracts,
            fee_fn=default_fee_fn,
            slippage_buffer=Decimal("0.005"),
            p_market=p_market_no,
        )

        # Conservative Decision Rule:
        # Require positive expected return AT CONSERVATIVE PROBABILITY after all fees and slippage
        best_eval = None
        action = "NO_TRADE"
        reason = None

        if eval_yes and eval_yes.conservative_ev_per_contract >= self.settings.min_conservative_edge:
            if eval_yes.net_roi >= self.settings.min_net_roi:
                best_eval = eval_yes
                action = "BUY_YES"

        if eval_no and eval_no.conservative_ev_per_contract >= self.settings.min_conservative_edge:
            if eval_no.net_roi >= self.settings.min_net_roi:
                # If both qualify, pick the higher conservative EV
                if (
                    not best_eval
                    or eval_no.conservative_ev_per_contract > best_eval.conservative_ev_per_contract
                ):
                    best_eval = eval_no
                    action = "BUY_NO"

        max_entry = None
        if best_eval:
            p_low = p_yes_low if action == "BUY_YES" else p_no_low
            max_entry = max_entry_price(
                p_side_low=p_low,
                fee_fn=default_fee_fn,
                min_edge=self.settings.min_conservative_edge,
                slippage_buffer=Decimal("0.005"),
                grid=book.grid,
            )
            self.record_decision(
                f"Candidate {action} on {ticker}: Edge=${best_eval.conservative_ev_per_contract:+.4f} ROI={best_eval.net_roi:.1%}",
                best_eval.to_dict(),
            )
        else:
            reason = "No side meets conservative edge and ROI thresholds after fees"

        return TradeSignal(
            ticker=ticker,
            action=action,
            evaluation=best_eval,
            max_entry_price=max_entry,
            rejection_reason=reason,
            forecast=forecast,
        )
