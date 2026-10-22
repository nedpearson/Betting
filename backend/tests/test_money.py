"""Unit tests for Decimal-safe money, price ranges, and PriceGrid."""

from decimal import Decimal

import pytest

from boi.money import (
    CENT,
    ONE,
    PRICE_Q,
    ZERO,
    D,
    PriceGrid,
    PriceRange,
    ceil_to,
    complement,
    floor_to,
    q_price,
    q_qty,
)


def test_decimal_conversion():
    assert D("0.4500") == Decimal("0.45")
    assert D(0.5) == Decimal("0.5")
    assert complement(Decimal("0.35")) == Decimal("0.65")
    with pytest.raises(ValueError):
        D("")


def test_quantization():
    assert q_price(Decimal("0.45678")) == Decimal("0.4568")
    assert q_qty(Decimal("10.559")) == Decimal("10.55")


def test_price_grid_linear():
    grid = PriceGrid([PriceRange(ZERO, ONE, CENT)])
    assert grid.is_valid(Decimal("0.50"))
    assert grid.is_valid(Decimal("0.01"))
    assert grid.is_valid(Decimal("0.99"))
    assert not grid.is_valid(Decimal("0.00"))  # boundary out of range
    assert not grid.is_valid(Decimal("1.00"))
    assert not grid.is_valid(Decimal("0.505"))  # sub-cent not valid on 1-cent grid

    # Snap floor
    assert grid.floor(Decimal("0.508")) == Decimal("0.50")
    assert grid.floor(Decimal("0.500")) == Decimal("0.50")
    assert grid.ceil(Decimal("0.501")) == Decimal("0.51")


def test_price_grid_tiered():
    # Kalshi center_deci_edge_centi_cent grid:
    # 0.0000 - 0.0100 step 0.0001
    # 0.0100 - 0.9900 step 0.0010
    # 0.9900 - 1.0000 step 0.0001
    grid = PriceGrid([
        PriceRange(Decimal("0.0000"), Decimal("0.0100"), Decimal("0.0001")),
        PriceRange(Decimal("0.0100"), Decimal("0.9900"), Decimal("0.0010")),
        PriceRange(Decimal("0.9900"), Decimal("1.0000"), Decimal("0.0001")),
    ])
    # Edge sub-penny is valid
    assert grid.is_valid(Decimal("0.0055"))
    assert grid.is_valid(Decimal("0.9955"))
    # In middle, 10th of a cent is valid
    assert grid.is_valid(Decimal("0.5010"))
    assert not grid.is_valid(Decimal("0.5015"))  # step is 0.0010 in middle
