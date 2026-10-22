"""Unit tests for Expected Value, walk book, and Kelly sizing."""

from decimal import Decimal

from boi.ev import (
    Level,
    contracts_for_risk,
    evaluate_buy,
    kelly_fraction_binary,
    max_entry_price,
    walk_book,
)
from boi.fees import default_fee_fn
from boi.money import CENT, ONE, ZERO, PriceGrid, PriceRange


def test_walk_book_multi_level():
    # Asks: 10 @ $0.40, 20 @ $0.42
    asks = [Level(Decimal("0.40"), Decimal("10")), Level(Decimal("0.42"), Decimal("20"))]

    # Buy 15 contracts: 10 @ 0.40 ($4.00), 5 @ 0.42 ($2.10) -> total premium $6.10, avg $0.4067
    fill = walk_book(asks, Decimal("15"), fee_fn=default_fee_fn, is_taker=True)
    assert fill.filled == Decimal("15")
    assert fill.avg_price == Decimal("0.4067")
    assert fill.worst_price == Decimal("0.42")
    assert fill.top_price == Decimal("0.40")


def test_evaluate_buy_conservative():
    # Model P(YES) point = 0.70, conservative lower bound = 0.62
    # Ask is at $0.55
    asks = [Level(Decimal("0.55"), Decimal("50"))]
    ev = evaluate_buy(
        side="yes",
        p_side=Decimal("0.70"),
        p_side_low=Decimal("0.62"),
        asks=asks,
        contracts=Decimal("10"),
        fee_fn=default_fee_fn,
        slippage_buffer=Decimal("0.005"),
        p_market=Decimal("0.53"),
    )
    assert ev is not None
    assert ev.p_point == Decimal("0.70")
    assert ev.p_conservative == Decimal("0.62")
    # Gross EV = 0.70 - 0.55 = +0.15
    assert ev.gross_ev_per_contract == Decimal("0.1500")
    # Conservative EV = 0.62 - (0.55 + fee + 0.005) > 0
    assert ev.conservative_ev_per_contract > Decimal("0")
    assert ev.net_roi > Decimal("0")


def test_kelly_sizing():
    # True win probability p = 0.60, cost = $0.50
    # Kelly fraction: (p - c) / (1 - c) = (0.60 - 0.50) / 0.50 = 0.20 (20%)
    kf = kelly_fraction_binary(Decimal("0.60"), Decimal("0.50"))
    assert kf == Decimal("0.20")

    # No edge: p <= cost -> Kelly is 0
    assert kelly_fraction_binary(Decimal("0.45"), Decimal("0.50")) == Decimal("0")


def test_max_entry_price_solver():
    grid = PriceGrid([PriceRange(ZERO, ONE, CENT)])
    # Conservative prob 0.65, min edge 0.03, buffer 0.005
    # Max price must ensure: 0.65 - P - fee(P) - 0.005 >= 0.03
    max_p = max_entry_price(
        p_side_low=Decimal("0.65"),
        fee_fn=default_fee_fn,
        min_edge=Decimal("0.03"),
        slippage_buffer=Decimal("0.005"),
        grid=grid,
    )
    assert max_p is not None
    assert max_p < Decimal("0.65")
    assert grid.is_valid(max_p)
