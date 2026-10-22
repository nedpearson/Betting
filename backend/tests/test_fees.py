"""Unit tests for Kalshi fee calculations (quadratic and rounding)."""

from decimal import Decimal

from boi.fees import FeeModel, default_fee_fn


def test_quadratic_taker_fee_100_contracts():
    model = FeeModel(fee_type="quadratic", fee_multiplier=1, is_direct_member=False)
    # At P = 0.50, C = 100:
    # 0.07 * 100 * 0.50 * 0.50 = 1.75 -> round up to cent = $1.75
    fee_50 = model.calculate_fill_fee(Decimal("0.50"), Decimal("100"), is_taker=True)
    assert fee_50 == Decimal("1.75")

    # At P = 0.10, C = 100:
    # 0.07 * 100 * 0.10 * 0.90 = 0.63 -> $0.63
    fee_10 = model.calculate_fill_fee(Decimal("0.10"), Decimal("100"), is_taker=True)
    assert fee_10 == Decimal("0.63")

    # At P = 0.01, C = 100:
    # 0.07 * 100 * 0.01 * 0.99 = 0.0693 -> round up to cent = $0.07
    fee_01 = model.calculate_fill_fee(Decimal("0.01"), Decimal("100"), is_taker=True)
    assert fee_01 == Decimal("0.07")


def test_maker_zero_fee_on_standard():
    model = FeeModel(fee_type="quadratic", fee_multiplier=1, is_direct_member=False)
    # Maker fees are $0 on standard quadratic markets
    fee_maker = model.calculate_fill_fee(Decimal("0.50"), Decimal("100"), is_taker=False)
    assert fee_maker == Decimal("0.00")


def test_maker_fee_on_with_maker_fees():
    model = FeeModel(fee_type="quadratic_with_maker_fees", fee_multiplier=1, is_direct_member=False)
    # Maker rate: 0.0175 * 100 * 0.50 * 0.50 = 0.4375 -> round up = $0.44
    fee_maker = model.calculate_fill_fee(Decimal("0.50"), Decimal("100"), is_taker=False)
    assert fee_maker == Decimal("0.44")
