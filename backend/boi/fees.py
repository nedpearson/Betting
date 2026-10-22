"""Kalshi fee schedule implementation.

Kalshi charges fees based on the series `fee_type` and `fee_multiplier`.
For standard event contracts, the primary fee model is the quadratic fee model:
    Taker: round_up(M * 0.07 * C * P * (1 - P))
    Maker: round_up(M * 0.0175 * C * P * (1 - P)) if maker fees apply, else 0

Where:
    - M is the series fee_multiplier (default 1.0)
    - C is the number of contracts
    - P is the price per contract in dollars ($0.0000 - $1.0000)
    - Round up to the nearest cent ($0.01) for standard non-direct/retail, or $0.0001 for direct API members.
"""

from __future__ import annotations

from decimal import ROUND_CEILING, Decimal

from .money import CENT, D, ONE, ZERO

TAKER_RATE_QUADRATIC = Decimal("0.07")
MAKER_RATE_QUADRATIC = Decimal("0.0175")
DIRECT_PRECISION = Decimal("0.0001")


class FeeModel:
    def __init__(
        self,
        fee_type: str = "quadratic",
        fee_multiplier: Decimal | float | int = Decimal("1"),
        is_direct_member: bool = False,
    ):
        self.fee_type = fee_type.lower() if fee_type else "quadratic"
        self.multiplier = D(fee_multiplier)
        self.rounding_unit = DIRECT_PRECISION if is_direct_member else CENT

    def calculate_fill_fee(
        self,
        price: Decimal,
        contracts: Decimal,
        is_taker: bool = True,
    ) -> Decimal:
        """Calculate the fee for a single fill at `price` for `contracts`."""
        if price <= ZERO or price >= ONE or contracts <= ZERO:
            return ZERO

        if self.fee_type == "flat":
            # flat fee per contract e.g. 0.01 or similar if configured
            rate = Decimal("0.01") if is_taker else ZERO
            raw_fee = self.multiplier * rate * contracts
        elif "maker" in self.fee_type or self.fee_type == "quadratic_with_maker_fees":
            rate = TAKER_RATE_QUADRATIC if is_taker else MAKER_RATE_QUADRATIC
            raw_fee = self.multiplier * rate * contracts * price * (ONE - price)
        elif self.fee_type == "quadratic":
            if not is_taker:
                return ZERO
            raw_fee = self.multiplier * TAKER_RATE_QUADRATIC * contracts * price * (ONE - price)
        elif self.fee_type == "zero" or self.fee_type == "none":
            return ZERO
        else:
            # Default to quadratic taker
            if not is_taker:
                return ZERO
            raw_fee = self.multiplier * TAKER_RATE_QUADRATIC * contracts * price * (ONE - price)

        # Round up according to member precision
        fee = (raw_fee / self.rounding_unit).to_integral_value(rounding=ROUND_CEILING) * self.rounding_unit
        return fee


def default_fee_fn(price: Decimal, contracts: Decimal, is_taker: bool = True) -> Decimal:
    """Convenience default quadratic fee function."""
    model = FeeModel(fee_type="quadratic", fee_multiplier=Decimal("1"), is_direct_member=False)
    return model.calculate_fill_fee(price, contracts, is_taker)
