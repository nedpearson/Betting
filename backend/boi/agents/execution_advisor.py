"""Agent 12 — Trade Execution Advisor.

Determines executable order structure, snaps limit prices to valid PriceGrids,
and manages execution modes (Intelligence Only vs Paper Trading vs Gated Live Orders).
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from ..config import Settings, get_settings
from ..db import Database, FillRecord, OrderRecord
from ..ev import TradeEvaluation
from ..events import FILL, ORDER_UPDATE, Event, EventBus
from ..fees import default_fee_fn
from ..kalshi.client import KalshiRestClient
from ..money import D, PriceGrid, q_price, q_qty
from ..orderbook import MarketOrderBook
from .base import BaseAgent

log = logging.getLogger("boi.agents.execution")


class TradeExecutionAdvisorAgent(BaseAgent):
    def __init__(
        self,
        bus: EventBus,
        db: Database,
        rest_client: KalshiRestClient,
        books: dict[str, MarketOrderBook],
        settings: Settings | None = None,
    ):
        super().__init__(name="Agent-12-TradeExecutionAdvisor", role="Execution Specialist", bus=bus)
        self.db = db
        self.rest = rest_client
        self.books = books
        self.settings = settings or get_settings()

    async def execute_order(
        self,
        ticker: str,
        side: str,  # "yes" | "no"
        contracts: Decimal,
        limit_price: Decimal,
        recommendation_id: str | None = None,
    ) -> OrderRecord:
        self.mark_active()
        mode = self.settings.execution_mode.value

        order_id = str(uuid.uuid4())
        client_order_id = f"boi-{order_id[:8]}"

        order = OrderRecord(
            id=order_id,
            client_order_id=client_order_id,
            mode=mode,
            ticker=ticker,
            side=side.lower(),
            action="buy",
            limit_price=str(limit_price),
            count=str(contracts),
            filled="0",
            avg_fill_price=None,
            fees="0",
            status="pending",
            recommendation_id=recommendation_id,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        async with self.db.session() as s:
            s.add(order)
            await s.commit()

        if mode == "paper":
            await self._simulate_paper_fill(order)
        elif mode == "live":
            await self._submit_live_order(order)
        else:
            order.status = "advisory_only"
            async with self.db.session() as s:
                await s.merge(order)
                await s.commit()

        return order

    async def _simulate_paper_fill(self, order: OrderRecord) -> None:
        """Paper trading: walks the real, live order book with fee deduction and records fills."""
        book = self.books.get(order.ticker)
        if not book:
            order.status = "rejected"
            order.detail = {"error": "no live book available for paper fill"}
            async with self.db.session() as s:
                await s.merge(order)
                await s.commit()
            return

        snap = book.get_snapshot()
        asks = snap.yes_asks if order.side == "yes" else snap.no_asks
        limit = D(order.limit_price)
        requested_qty = D(order.count)

        filled_qty = Decimal("0")
        total_cost = Decimal("0")
        total_fees = Decimal("0")
        fills_to_add: list[FillRecord] = []

        for lvl in asks:
            if filled_qty >= requested_qty or lvl.price > limit:
                break
            take = min(requested_qty - filled_qty, lvl.qty)
            if take <= Decimal("0"):
                continue

            fee = default_fee_fn(lvl.price, take, is_taker=True)
            filled_qty += take
            total_cost += take * lvl.price
            total_fees += fee

            fill = FillRecord(
                id=str(uuid.uuid4()),
                order_id=order.id,
                mode="paper",
                ticker=order.ticker,
                side=order.side,
                action="buy",
                price=str(lvl.price),
                count=str(take),
                fee=str(fee),
                is_taker=True,
                ts=datetime.now(UTC),
            )
            fills_to_add.append(fill)

        if filled_qty > Decimal("0"):
            avg_p = q_price(total_cost / filled_qty)
            order.filled = str(filled_qty)
            order.avg_fill_price = str(avg_p)
            order.fees = str(total_fees)
            order.status = "executed" if filled_qty >= requested_qty else "partially_filled"
            order.updated_at = datetime.now(UTC)

            async with self.db.session() as s:
                await s.merge(order)
                s.add_all(fills_to_add)
                await s.commit()

            self.record_decision(
                f"Paper fill on {order.ticker}: {filled_qty}/{requested_qty} @ avg ${avg_p} (fees: ${total_fees})",
                {"filled": str(filled_qty), "avg_price": str(avg_p), "fees": str(total_fees)},
            )
            await self.bus.publish(
                Event(
                    type=FILL,
                    source=self.name,
                    ticker=order.ticker,
                    payload={"order_id": order.id, "mode": "paper", "filled": str(filled_qty), "price": str(avg_p)},
                )
            )
        else:
            order.status = "canceled"
            order.detail = {"reason": "no executable liquidity below limit price"}
            async with self.db.session() as s:
                await s.merge(order)
                await s.commit()

    async def _submit_live_order(self, order: OrderRecord) -> None:
        """Gated live order execution with hard safety verification."""
        if not self.settings.live_execution_permitted_by_config:
            order.status = "rejected"
            order.detail = {"error": "Live execution blocked: safety authorization gates not satisfied"}
            async with self.db.session() as s:
                await s.merge(order)
                await s.commit()
            self.record_error("LIVE ORDER BLOCKED: Authorization gates not satisfied")
            return

        try:
            # Map side to Kalshi V2 book side: "bid" for YES, "ask" for NO
            book_side = "bid" if order.side == "yes" else "ask"
            payload = {
                "ticker": order.ticker,
                "client_order_id": order.client_order_id,
                "side": book_side,
                "count": str(order.count),
                "price": str(order.limit_price),
                "time_in_force": "good_till_canceled",
                "self_trade_prevention_type": "taker_at_cross",
                "post_only": False,
            }
            resp = await self.rest.create_order_v2(payload)
            ex_order = resp.get("order", {})
            order.exchange_order_id = ex_order.get("order_id")
            order.status = ex_order.get("status", "resting")
            order.detail = resp
            async with self.db.session() as s:
                await s.merge(order)
                await s.commit()

            self.record_decision(f"LIVE ORDER SUBMITTED: {order.ticker} {book_side} {order.count} @ {order.limit_price}")
        except Exception as e:
            order.status = "rejected"
            order.detail = {"error": str(e)}
            async with self.db.session() as s:
                await s.merge(order)
                await s.commit()
            self.record_error(f"Live order submission failed: {e}")
