"""Local order book maintenance for Kalshi binary markets.

Kalshi binary order book mechanics:
- The exchange only reports resting bids for YES and NO.
- Buying YES at price P is economically and mechanically identical to matching a resting NO bid at 1 - P.
- Therefore:
    - Executable YES Asks = {Price: 1 - P_no, Qty: Q_no} for each resting NO bid.
    - Executable NO Asks = {Price: 1 - P_yes, Qty: Q_yes} for each resting YES bid.
- Tracks sequence numbers (`seq`), timestamps, transport (`ws` vs `rest`), and staleness.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal

from .ev import Level
from .money import D, ONE, ZERO, PriceGrid, complement, q_price, q_qty


@dataclass
class OrderBookSnapshot:
    ticker: str
    yes_bids: list[Level]  # sorted descending by price
    no_bids: list[Level]  # sorted descending by price
    yes_asks: list[Level]  # derived, sorted ascending by price
    no_asks: list[Level]  # derived, sorted ascending by price
    best_yes_bid: Decimal | None
    best_yes_ask: Decimal | None
    best_no_bid: Decimal | None
    best_no_ask: Decimal | None
    spread: Decimal | None
    mid_price: Decimal | None
    implied_prob_yes: Decimal | None
    last_seq: int
    last_updated_mono: float
    last_updated_utc: datetime
    source_ts: datetime | None
    transport: str  # "ws" | "rest"
    is_stale: bool


class MarketOrderBook:
    def __init__(self, ticker: str, grid: PriceGrid | None = None):
        self.ticker = ticker
        self.grid = grid or PriceGrid([])
        # price -> qty (Decimal)
        self.yes_bids: dict[Decimal, Decimal] = {}
        self.no_bids: dict[Decimal, Decimal] = {}
        self.last_seq: int = -1
        self.last_updated_mono: float = 0.0
        self.last_updated_utc: datetime = datetime.now(UTC)
        self.source_ts: datetime | None = None
        self.transport: str = "init"
        self.gap_detected: bool = False

    def reset(self) -> None:
        self.yes_bids.clear()
        self.no_bids.clear()
        self.last_seq = -1
        self.gap_detected = False

    def apply_snapshot(
        self,
        yes_bids_raw: list[dict] | list[list],
        no_bids_raw: list[dict] | list[list],
        seq: int = 0,
        source_ts: datetime | None = None,
        transport: str = "rest",
    ) -> None:
        """Apply full snapshot. Formats handled: [[price, qty], ...] or [{'price': ..., 'count': ...}, ...]"""
        self.reset()
        self.last_seq = seq
        self.source_ts = source_ts
        self.transport = transport
        self.last_updated_mono = time.monotonic()
        self.last_updated_utc = datetime.now(UTC)

        for item in yes_bids_raw:
            p, q = self._parse_level(item)
            if p is not None and q > ZERO:
                self.yes_bids[p] = q

        for item in no_bids_raw:
            p, q = self._parse_level(item)
            if p is not None and q > ZERO:
                self.no_bids[p] = q

    def apply_delta(
        self,
        side: str,  # "yes" | "no"
        price_raw: str | float | Decimal,
        delta_qty_raw: str | float | Decimal,
        seq: int,
        source_ts: datetime | None = None,
    ) -> bool:
        """Apply incremental delta. Returns False if a sequence gap is detected."""
        if self.last_seq >= 0 and seq != self.last_seq + 1:
            self.gap_detected = True
            return False

        self.last_seq = seq
        self.source_ts = source_ts
        self.last_updated_mono = time.monotonic()
        self.last_updated_utc = datetime.now(UTC)
        self.transport = "ws"

        p = q_price(D(price_raw))
        dq = q_qty(D(delta_qty_raw))

        target_book = self.yes_bids if side.lower() == "yes" else self.no_bids
        curr_qty = target_book.get(p, ZERO)
        new_qty = curr_qty + dq

        if new_qty <= ZERO:
            target_book.pop(p, None)
        else:
            target_book[p] = new_qty

        return True

    def _parse_level(self, item: dict | list | tuple) -> tuple[Decimal | None, Decimal]:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            p = q_price(D(item[0]))
            q = q_qty(D(item[1]))
            return p, q
        elif isinstance(item, dict):
            # Check price / count fields
            p_val = item.get("price") or item.get("p") or item.get("price_dollars")
            q_val = item.get("count") or item.get("qty") or item.get("size") or item.get("size_fp")
            if p_val is not None and q_val is not None:
                return q_price(D(p_val)), q_qty(D(q_val))
        return None, ZERO

    def get_snapshot(self, max_age_sec: float = 15.0) -> OrderBookSnapshot:
        now_mono = time.monotonic()
        age = now_mono - self.last_updated_mono if self.last_updated_mono > 0 else 999999.0
        is_stale = age > max_age_sec or self.gap_detected

        # Sorted YES bids (highest price first)
        yes_bids = sorted(
            [Level(p, q) for p, q in self.yes_bids.items() if q > ZERO],
            key=lambda l: l.price,
            reverse=True,
        )
        # Sorted NO bids (highest price first)
        no_bids = sorted(
            [Level(p, q) for p, q in self.no_bids.items() if q > ZERO],
            key=lambda l: l.price,
            reverse=True,
        )

        # Derived YES asks = complement of NO bids, sorted ascending (lowest price first)
        yes_asks = sorted(
            [Level(complement(lvl.price), lvl.qty) for lvl in no_bids],
            key=lambda l: l.price,
        )
        # Derived NO asks = complement of YES bids, sorted ascending
        no_asks = sorted(
            [Level(complement(lvl.price), lvl.qty) for lvl in yes_bids],
            key=lambda l: l.price,
        )

        best_yes_bid = yes_bids[0].price if yes_bids else None
        best_yes_ask = yes_asks[0].price if yes_asks else None
        best_no_bid = no_bids[0].price if no_bids else None
        best_no_ask = no_asks[0].price if no_asks else None

        spread = None
        mid_price = None
        if best_yes_bid is not None and best_yes_ask is not None:
            spread = best_yes_ask - best_yes_bid
            mid_price = q_price((best_yes_bid + best_yes_ask) / Decimal("2"))
        elif best_yes_ask is not None:
            spread = best_yes_ask
            mid_price = best_yes_ask
        elif best_yes_bid is not None:
            spread = ONE - best_yes_bid
            mid_price = best_yes_bid

        implied_prob_yes = mid_price

        return OrderBookSnapshot(
            ticker=self.ticker,
            yes_bids=yes_bids,
            no_bids=no_bids,
            yes_asks=yes_asks,
            no_asks=no_asks,
            best_yes_bid=best_yes_bid,
            best_yes_ask=best_yes_ask,
            best_no_bid=best_no_bid,
            best_no_ask=best_no_ask,
            spread=spread,
            mid_price=mid_price,
            implied_prob_yes=implied_prob_yes,
            last_seq=self.last_seq,
            last_updated_mono=self.last_updated_mono,
            last_updated_utc=self.last_updated_utc,
            source_ts=self.source_ts,
            transport=self.transport,
            is_stale=is_stale,
        )
