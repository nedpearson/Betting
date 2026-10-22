"""Decimal-safe money, price and quantity arithmetic.

Kalshi transmits prices as fixed-point dollar strings with 4 decimals (e.g. "0.4500") and
contract quantities as fixed-point strings with 2 decimals (e.g. "10.00"). Floats are never
used for money in this codebase. Every market carries ``price_ranges`` describing the valid
price grid (e.g. 1-cent steps, or sub-penny steps near the edges).
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_EVEN, Decimal, InvalidOperation
from typing import Any

PRICE_Q = Decimal("0.0001")
QTY_Q = Decimal("0.01")
CENT = Decimal("0.01")
ZERO = Decimal("0")
ONE = Decimal("1")


def D(x: Any) -> Decimal:
    """Convert API values to Decimal. Floats are converted via str() to avoid binary artifacts."""
    if isinstance(x, Decimal):
        return x
    if x is None or x == "":
        raise ValueError("cannot convert empty value to Decimal")
    if isinstance(x, float):
        x = repr(x)
    try:
        return Decimal(str(x))
    except InvalidOperation as e:
        raise ValueError(f"invalid decimal: {x!r}") from e


def D_or_none(x: Any) -> Decimal | None:
    if x is None or x == "":
        return None
    return D(x)


def q_price(x: Decimal) -> Decimal:
    return x.quantize(PRICE_Q, rounding=ROUND_HALF_EVEN)


def q_qty(x: Decimal) -> Decimal:
    return x.quantize(QTY_Q, rounding=ROUND_FLOOR)


def ceil_to(x: Decimal, step: Decimal) -> Decimal:
    return (x / step).to_integral_value(rounding=ROUND_CEILING) * step


def floor_to(x: Decimal, step: Decimal) -> Decimal:
    return (x / step).to_integral_value(rounding=ROUND_FLOOR) * step


def complement(price: Decimal) -> Decimal:
    """YES price p <-> NO price (1 - p) in a $1-notional binary market."""
    return ONE - price


@dataclass(frozen=True)
class PriceRange:
    start: Decimal
    end: Decimal
    step: Decimal


class PriceGrid:
    """The set of valid limit prices for a market, built from its ``price_ranges``.

    Ranges are half-open on the low side as published, e.g.
    [{"start":"0.0000","end":"0.0100","step":"0.0001"}, {"start":"0.0100","end":"0.9900","step":"0.0010"}, ...]
    A price is valid when it lies strictly inside (0, 1) and is an integer multiple of the step
    (measured from the range start) of the range that contains it.
    """

    def __init__(self, ranges: list[PriceRange]):
        if not ranges:
            ranges = [PriceRange(ZERO, ONE, CENT)]
        self.ranges = sorted(ranges, key=lambda r: r.start)

    @classmethod
    def from_api(cls, raw: list[dict] | None) -> PriceGrid:
        if not raw:
            return cls([])
        return cls([PriceRange(D(r["start"]), D(r["end"]), D(r["step"])) for r in raw])

    def _range_for(self, price: Decimal) -> PriceRange | None:
        for r in self.ranges:
            if r.start <= price <= r.end:
                return r
        return None

    def is_valid(self, price: Decimal) -> bool:
        if price <= ZERO or price >= ONE:
            return False
        for r in self.ranges:
            if r.start <= price <= r.end and ((price - r.start) % r.step) == ZERO:
                return True
        return False

    def floor(self, price: Decimal) -> Decimal | None:
        """Largest valid price <= ``price`` (used for max-entry limit prices: never overpay)."""
        r = self._range_for(price)
        if r is None:
            return None
        p = r.start + floor_to(price - r.start, r.step)
        return p if self.is_valid(p) else None

    def ceil(self, price: Decimal) -> Decimal | None:
        r = self._range_for(price)
        if r is None:
            return None
        p = r.start + ceil_to(price - r.start, r.step)
        return p if self.is_valid(p) else None

    def min_step_at(self, price: Decimal) -> Decimal:
        r = self._range_for(price)
        return r.step if r else CENT
