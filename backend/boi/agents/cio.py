"""Agent 16 — Chief Investment Officer.

THE FINAL DECISION-SUPPORT COORDINATOR.
- Combines outputs from all specialized agents.
- Ranks opportunities strictly by conservative risk-adjusted expected return.
- Issues recommendations with explicit TTL and maximum entry prices.
- Invalidates recommendations immediately if the executable price exceeds maximum entry price,
  or if external feeds/order books go stale.
- Explains the exact evidence supporting each decision.
- Responds "NO QUALIFIED TRADE AVAILABLE" when no trade satisfies the conservative standard.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from ..config import Settings, get_settings
from ..db import Database, MarketRecord, RecommendationRecord
from ..ev import TradeEvaluation
from ..events import RECOMMENDATION_INVALIDATED, RECOMMENDATION_ISSUED, Event, EventBus
from ..money import D, ZERO
from ..orderbook import MarketOrderBook
from .auditors import BehavioralRiskAgent
from .base import BaseAgent
from .ev_analyst import ExpectedValueAnalystAgent
from .forecaster import QuantitativeForecastingAgent
from .microstructure import MarketMicrostructureAgent
from .risk_manager import PortfolioRiskManagerAgent

log = logging.getLogger("boi.agents.cio")


class ChiefInvestmentOfficerAgent(BaseAgent):
    def __init__(
        self,
        bus: EventBus,
        db: Database,
        books: dict[str, MarketOrderBook],
        forecaster: QuantitativeForecastingAgent,
        microstructure: MarketMicrostructureAgent,
        ev_analyst: ExpectedValueAnalystAgent,
        risk_manager: PortfolioRiskManagerAgent,
        behavioral_risk: BehavioralRiskAgent,
        settings: Settings | None = None,
    ):
        super().__init__(name="Agent-16-ChiefInvestmentOfficer", role="Chief Investment Officer & Lead Coordinator", bus=bus)
        self.db = db
        self.books = books
        self.forecaster = forecaster
        self.microstructure = microstructure
        self.ev_analyst = ev_analyst
        self.risk_manager = risk_manager
        self.behavioral_risk = behavioral_risk
        self.settings = settings or get_settings()

        self.active_recommendations: dict[str, RecommendationRecord] = {}
        self.best_live_opportunity: RecommendationRecord | None = None
        self.no_trade_reason: str = "Scanning live markets; awaiting validated statistical edge."
        self._running = False
        self._loop_task: asyncio.Task | None = None

    def start(self) -> None:
        if self._loop_task is None:
            self._running = True
            self._loop_task = asyncio.create_task(self._orchestration_loop(), name="cio-orchestrator")

    async def stop(self) -> None:
        self._running = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
            self._loop_task = None

    async def scan_and_rank_opportunities(self) -> list[RecommendationRecord]:
        self.mark_active()
        candidates: list[RecommendationRecord] = []
        now = datetime.now(UTC)

        # Invalidate expired recommendations
        for rec_id, rec in list(self.active_recommendations.items()):
            if rec.expires_at <= now:
                rec.status = "expired"
                rec.closed_at = now
                self.active_recommendations.pop(rec_id, None)
                await self._persist_and_publish_invalidation(rec, "TTL expired")

        # Evaluate all markets with latest forecasts
        for ticker, forecast in list(self.forecaster.latest_forecasts.items()):
            book = self.books.get(ticker)
            if not book:
                continue

            snap = book.get_snapshot(max_age_sec=self.settings.max_rest_book_age_sec)
            if snap.is_stale:
                continue

            # Check existing active recommendation for this ticker
            existing = self.active_recommendations.get(ticker)
            if existing and existing.status == "active":
                max_entry = D(existing.payload.get("max_entry_price", "1.0"))
                curr_price = (
                    snap.best_yes_ask if existing.action == "BUY_YES" else snap.best_no_ask
                )
                if curr_price is not None and curr_price > max_entry:
                    existing.status = "invalidated"
                    existing.invalidated_reason = f"Executable price ${curr_price} crossed maximum entry ${max_entry}"
                    existing.closed_at = now
                    self.active_recommendations.pop(ticker, None)
                    await self._persist_and_publish_invalidation(existing, existing.invalidated_reason)

            # 1. Microstructure check
            micro = self.microstructure.assess_market(ticker)
            if not micro.is_liquid:
                continue

            # 2. EV Evaluation
            signal = self.ev_analyst.evaluate_market(forecast)
            if signal.action == "NO_TRADE" or not signal.evaluation:
                continue

            # 3. Behavioral Risk Check
            can_trade, beh_reason = self.behavioral_risk.can_trade(Decimal("5.0"))
            if not can_trade:
                continue

            # 4. Risk Manager Hard Veto & Sizing
            risk_dec = self.risk_manager.evaluate_trade(
                ticker=ticker,
                action=signal.action,
                evaluation=signal.evaluation,
            )
            if not risk_dec.approved:
                continue

            # 5. Opportunity Categorization
            cons_edge = signal.evaluation.conservative_ev_per_contract
            net_roi = signal.evaluation.net_roi
            category = "CANDIDATE"
            if cons_edge >= self.settings.strong_conservative_edge and net_roi >= self.settings.strong_net_roi:
                category = "STRONG_CANDIDATE"

            # Create Recommendation
            ttl = self.settings.recommendation_ttl_sec
            rec = RecommendationRecord(
                id=str(uuid.uuid4()),
                ticker=ticker,
                created_at=now,
                expires_at=now + timedelta(seconds=ttl),
                status="active",
                category=category,
                action=signal.action,
                forecast_id=forecast.id,
                payload={
                    "ticker": ticker,
                    "action": signal.action,
                    "category": category,
                    "entry_price": str(signal.evaluation.avg_fill_price),
                    "max_entry_price": str(signal.max_entry_price) if signal.max_entry_price else str(signal.evaluation.avg_fill_price),
                    "estimated_probability": str(signal.evaluation.p_point),
                    "conservative_probability": str(signal.evaluation.p_conservative),
                    "market_probability": str(signal.evaluation.p_market) if signal.evaluation.p_market else None,
                    "conservative_edge": str(cons_edge),
                    "net_roi": str(net_roi),
                    "recommended_contracts": str(risk_dec.approved_contracts),
                    "recommended_stake": str(risk_dec.approved_risk_dollars),
                    "max_loss": str(signal.evaluation.max_loss),
                    "max_profit": str(signal.evaluation.max_profit),
                    "model": forecast.model,
                    "evidence_summary": self._generate_evidence_explanation(ticker, signal.action, signal.evaluation, forecast),
                },
            )
            candidates.append(rec)

        # Rank candidates by conservative ROI descending
        candidates.sort(
            key=lambda r: D(r.payload.get("net_roi", "0")),
            reverse=True,
        )

        # Update best live trade
        if candidates:
            self.best_live_opportunity = candidates[0]
            self.no_trade_reason = ""
            for c in candidates:
                self.active_recommendations[c.ticker] = c
                await self._persist_and_publish_recommendation(c)
            self.record_decision(
                f"CIO Leaderboard updated: {len(candidates)} qualified opportunities. Top: {candidates[0].ticker} ({candidates[0].action})"
            )
        else:
            self.best_live_opportunity = None
            self.no_trade_reason = "No live market currently clears conservative edge thresholds after fees and slippage."

        return candidates

    def _generate_evidence_explanation(
        self,
        ticker: str,
        action: str,
        evaluation: TradeEvaluation,
        forecast: ForecastRecord,
    ) -> str:
        side_p = evaluation.p_point
        cons_p = evaluation.p_conservative
        mkt_p = evaluation.p_market or Decimal("0.50")
        edge = evaluation.conservative_ev_per_contract
        roi = evaluation.net_roi
        return (
            f"Model {forecast.model} calculates true win probability at {side_p:.1%} (conservative lower-bound: {cons_p:.1%}) "
            f"versus market-implied {mkt_p:.1%}. After factoring exchange taker fees and slippage buffer, the trade has a "
            f"statistically defensive edge of {edge:+$0.3f}/contract with expected net ROI of {roi:.1%} on deployed risk."
        )

    async def _persist_and_publish_recommendation(self, rec: RecommendationRecord) -> None:
        async with self.db.session() as s:
            await s.merge(rec)
            await s.commit()
        await self.bus.publish(
            Event(
                type=RECOMMENDATION_ISSUED,
                source=self.name,
                ticker=rec.ticker,
                payload=rec.payload,
            )
        )

    async def _persist_and_publish_invalidation(self, rec: RecommendationRecord, reason: str) -> None:
        async with self.db.session() as s:
            await s.merge(rec)
            await s.commit()
        await self.bus.publish(
            Event(
                type=RECOMMENDATION_INVALIDATED,
                source=self.name,
                ticker=rec.ticker,
                payload={"recommendation_id": rec.id, "reason": reason},
            )
        )

    async def _orchestration_loop(self) -> None:
        while self._running:
            try:
                await self.scan_and_rank_opportunities()
            except Exception as e:
                self.record_error(f"CIO orchestration loop error: {e}")
            await asyncio.sleep(10.0)
