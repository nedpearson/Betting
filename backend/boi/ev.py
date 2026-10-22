"""Expected-value engine for $1-notional binary contracts.

Principle: a correct prediction can still be a losing investment if the contract is overpriced.
All evaluations are computed against *executable* prices obtained by walking the actual order book
for the requested quantity, after fees (exact Kalshi formula + rounding), and after a slippage buffer.

Eligibility is tested at the *conservative* probability (the lower bound of the model's uncertainty
interval for the side being bought), never at the point estimate.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from decimal import ROUND_FLOOR, Decimal

from .money import ONE, PRICE_Q, ZERO, PriceGrid, q_price

# fee_fn(price, contracts, is_taker) -> total fee in dollars for that fill
FeeFn = Callable[[Decimal, Decimal, bool], Decimal]


@dataclass(frozen=True)
class Level:
    price: Decimal  # executable price to BUY this side at this level
    qty: Decimal


@dataclass
class FillEstimate:
    requested: Decimal
    filled: Decimal
    avg_price: Decimal | None
    worst_price: Decimal | None
    top_price: Decimal | None
    fees: Decimal
    cost: Decimal  # premium + fees
    levels: list[tuple[str, str]] = field(default_factory=list)

    @property
    def complete(self) -> bool:
        return self.filled >= self.requested


def walk_book(asks: list[Level], qty: Decimal, fee_fn: FeeFn, is_taker: bool = True,
              limit_price: Decimal | None = None) -> FillEstimate:
    """Simulate a marketable buy of ``qty`` contracts against ascending ask levels.

    Fees are computed per price level (each level is a separate fill on Kalshi), which is what
    the exchange charges. Levels above ``limit_price`` are not consumed.
    """
    remaining = qty
    premium = ZERO
    fees = ZERO
    filled = ZERO
    worst = None
    used: list[tuple[str, str]] = []
    for lvl in sorted(asks, key=lambda l: l.price):
        if remaining <= ZERO:
            break
        if limit_price is not None and lvl.price > limit_price:
            break
        take = min(remaining, lvl.qty)
        if take <= ZERO:
            continue
        premium += take * lvl.price
        fees += fee_fn(lvl.price, take, is_taker)
        filled += take
        remaining -= take
        worst = lvl.price
        used.append((str(lvl.price), str(take)))
    avg = q_price(premium / filled) if filled > ZERO else None
    top = min((l.price for l in asks), default=None)
    return FillEstimate(qty, filled, avg, worst, top, fees, premium + fees, used)


@dataclass
class TradeEvaluation:
    side: str  # "yes" | "no"
    contracts: Decimal
    top_price: Decimal | None
    avg_fill_price: Decimal | None
    fill_complete: bool
    p_point: Decimal  # probability the purchased side wins (point estimate)
    p_conservative: Decimal  # lower bound for the purchased side
    p_market: Decimal | None  # market-implied probability for this side (mid)
    fees_total: Decimal
    fee_per_contract: Decimal
    slippage_buffer_per_contract: Decimal
    cost_per_contract: Decimal  # avg price + fee/contract + buffer
    break_even_prob: Decimal
    gross_ev_per_contract: Decimal  # p - avg price
    net_ev_per_contract: Decimal  # p - cost
    conservative_ev_per_contract: Decimal  # p_cons - cost
    net_roi: Decimal  # net EV / capital deployed
    conservative_roi: Decimal
    edge_vs_break_even: Decimal
    max_loss: Decimal
    max_profit: Decimal
    stress_ev: Decimal  # EV if true prob is p_cons minus a further stress shock
    fill_levels: list[tuple[str, str]]

    def to_dict(self) -> dict:
        d = asdict(self)
        return {k: (str(v) if isinstance(v, Decimal) else v) for k, v in d.items()}


def evaluate_buy(*, side: str, p_side: Decimal, p_side_low: Decimal, asks: list[Level], contracts: Decimal,
                 fee_fn: FeeFn, slippage_buffer: Decimal = Decimal("0.005"), p_market: Decimal | None = None,
                 stress_shock: Decimal = Decimal("0.05"), is_taker: bool = True,
                 limit_price: Decimal | None = None) -> TradeEvaluation | None:
    """Evaluate buying ``contracts`` of ``side`` against the executable ask ladder for that side."""
    if contracts <= ZERO or not asks:
        return None
    fill = walk_book(asks, contracts, fee_fn, is_taker=is_taker, limit_price=limit_price)
    if fill.filled <= ZERO or fill.avg_price is None:
        return None
    n = fill.filled
    fee_pc = fill.fees / n
    cost_pc = fill.avg_price + fee_pc + slippage_buffer
    gross = p_side - fill.avg_price
    net = p_side - cost_pc
    cons = p_side_low - cost_pc
    capital_pc = fill.avg_price + fee_pc
    stress_p = max(ZERO, p_side_low - stress_shock)
    return TradeEvaluation(
        side=side,
        contracts=n,
        top_price=fill.top_price,
        avg_fill_price=fill.avg_price,
        fill_complete=fill.complete,
        p_point=p_side,
        p_conservative=p_side_low,
        p_market=p_market,
        fees_total=fill.fees,
        fee_per_contract=q_price(fee_pc),
        slippage_buffer_per_contract=slippage_buffer,
        cost_per_contract=q_price(cost_pc),
        break_even_prob=q_price(cost_pc),
        gross_ev_per_contract=q_price(gross),
        net_ev_per_contract=q_price(net),
        conservative_ev_per_contract=q_price(cons),
        net_roi=q_price(net / capital_pc) if capital_pc > ZERO else ZERO,
        conservative_roi=q_price(cons / capital_pc) if capital_pc > ZERO else ZERO,
        edge_vs_break_even=q_price(p_side - cost_pc),
        max_loss=(fill.cost).quantize(Decimal("0.01")),
        max_profit=(n * ONE - fill.cost).quantize(Decimal("0.01")),
        stress_ev=q_price((stress_p - cost_pc) * n),
        fill_levels=fill.levels,
    )


def max_entry_price(*, p_side_low: Decimal, fee_fn: FeeFn, min_edge: Decimal, slippage_buffer: Decimal,
                    grid: PriceGrid, is_taker: bool = True) -> Decimal | None:
    """Highest valid limit price at which the conservative EV per contract still clears ``min_edge``.

    Solves p_low - price - fee(price)/1 - buffer >= min_edge by scanning down the price grid
    (fees are non-linear and rounded, so a closed form is not exact).
    """
    target = p_side_low - min_edge - slippage_buffer
    if target <= ZERO:
        return None
    p = grid.floor(min(target, ONE - PRICE_Q))
    # Use a 100-contract reference lot so per-contract fee rounding is representative.
    lot = Decimal("100")
    while p is not None and p > ZERO:
        fee_pc = fee_fn(p, lot, is_taker) / lot
        if p_side_low - p - fee_pc - slippage_buffer >= min_edge:
            return p
        step = grid.min_step_at(p)
        nxt = p - step
        if nxt <= ZERO:
            return None
        p = grid.floor(nxt)
    return None


def kelly_fraction_binary(p: Decimal, cost: Decimal) -> Decimal:
    """Full-Kelly fraction of bankroll to *risk* on a binary contract costing ``cost`` paying $1.

    Net odds b = (1 - c) / c. f* = (b p - q) / b = (p - c) / (1 - c).
    Returns 0 when there is no edge.
    """
    if cost <= ZERO or cost >= ONE:
        return ZERO
    f = (p - cost) / (ONE - cost)
    return f if f > ZERO else ZERO


def contracts_for_risk(risk_dollars: Decimal, cost_per_contract: Decimal, whole_contracts: bool = True) -> Decimal:
    if cost_per_contract <= ZERO or risk_dollars <= ZERO:
        return ZERO
    n = risk_dollars / cost_per_contract
    if whole_contracts:
        return n.to_integral_value(rounding=ROUND_FLOOR)
    return n.quantize(Decimal("0.01"), rounding=ROUND_FLOOR)
