"""Unit tests for binary order book mechanics, opposite-ask derivation, and sequence gaps."""

from decimal import Decimal

from boi.orderbook import MarketOrderBook


def test_orderbook_opposite_ask_derivation():
    book = MarketOrderBook(ticker="TEST-MARKET")
    # Yes bids: 100 @ $0.40
    # No bids: 50 @ $0.55
    book.apply_snapshot(
        yes_bids_raw=[["0.4000", "100.00"]],
        no_bids_raw=[["0.5500", "50.00"]],
        seq=1,
    )
    snap = book.get_snapshot()

    # Derived YES ask is complement of best NO bid: 1 - 0.55 = $0.45
    assert snap.best_yes_ask == Decimal("0.4500")
    assert snap.best_yes_bid == Decimal("0.4000")
    # Spread = 0.45 - 0.40 = 0.05
    assert snap.spread == Decimal("0.0500")
    assert snap.mid_price == Decimal("0.4250")

    # Derived NO ask is complement of best YES bid: 1 - 0.40 = $0.60
    assert snap.best_no_ask == Decimal("0.6000")
    assert snap.best_no_bid == Decimal("0.5500")


def test_orderbook_sequence_gap():
    book = MarketOrderBook(ticker="TEST-MARKET")
    book.apply_snapshot(yes_bids_raw=[["0.40", "10"]], no_bids_raw=[], seq=10)

    # Next delta with seq=11 is OK
    ok = book.apply_delta(side="yes", price_raw="0.41", delta_qty_raw="5", seq=11)
    assert ok
    assert not book.gap_detected

    # Next delta with seq=13 (skipped 12) must report sequence gap
    ok_gap = book.apply_delta(side="yes", price_raw="0.42", delta_qty_raw="5", seq=13)
    assert not ok_gap
    assert book.gap_detected
    assert book.get_snapshot().is_stale
