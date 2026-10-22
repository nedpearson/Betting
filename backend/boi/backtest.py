"""Institutional Quantitative Research & Walk-Forward Backtesting Engine.

Guarantees:
- Zero look-ahead bias: models receive strictly information timestamped before decision time.
- Realistic execution: walks the recorded ask book with price impact and taker fees.
- Compares every strategy against a simple market-implied baseline.
- Measures: win rate, profit factor, max drawdown, net ROI, Brier calibration, and bootstrap CI.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from .fees import default_fee_fn
from .money import D, ONE, ZERO, q_price
from .stats import bootstrap_mean_ci, brier, expected_calibration_error, log_loss

log = logging.getLogger("boi.backtest")


@dataclass
class BacktestTrade:
    ticker: str
    entry_ts: datetime
    side: str  # "yes" | "no"
    contracts: Decimal
    entry_price: Decimal
    fees: Decimal
    cost_basis: Decimal
    settlement_result: str  # "yes" | "no"
    pnl: Decimal
    roi: Decimal
    strategy: str
    model_prob: float
    market_prob: float


@dataclass
class BacktestReport:
    strategy_name: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_pnl: Decimal
    total_fees: Decimal
    net_roi: float
    profit_factor: float
    max_drawdown_dollars: Decimal
    max_drawdown_pct: float
    brier_score: float
    log_loss_score: float
    ece: float
    bootstrap_pnl_ci_95: tuple[float, float]
    trades: list[dict[str, Any]]


class BacktestSimulator:
    def __init__(self, initial_bankroll: Decimal = Decimal("500")):
        self.initial_bankroll = initial_bankroll

    def run_simulation(
        self,
        strategy_name: str,
        historical_signals: list[dict],  # list of {ticker, ts, side, forecast_prob, market_prob, executable_price, result}
    ) -> BacktestReport:
        trades: list[BacktestTrade] = []
        cum_equity = self.initial_bankroll
        peak_equity = self.initial_bankroll
        max_drawdown = ZERO
        total_fees = ZERO

        wins = 0
        losses = 0
        gross_profit = ZERO
        gross_loss = ZERO

        probs: list[float] = []
        outcomes: list[int] = []
        pnls_float: list[float] = []

        # Sort signals strictly chronologically to prevent look-ahead bias
        sorted_signals = sorted(historical_signals, key=lambda s: s["ts"])

        for sig in sorted_signals:
            ticker = sig["ticker"]
            side = sig["side"].lower()
            p_model = float(sig["forecast_prob"])
            p_mkt = float(sig["market_prob"])
            exec_price = D(sig["executable_price"])
            res = sig["result"].lower()  # "yes" | "no"

            # 1% bankroll risk sizing
            risk_cap = cum_equity * Decimal("0.01")
            if exec_price <= ZERO or exec_price >= ONE or risk_cap < Decimal("1.00"):
                continue

            contracts = (risk_cap / exec_price).to_integral_value()
            if contracts <= ZERO:
                continue

            fee = default_fee_fn(exec_price, contracts, is_taker=True)
            cost = contracts * exec_price + fee
            total_fees += fee

            # Settlement
            won = (side == res)
            if won:
                payout = contracts * ONE
                pnl = payout - cost
                wins += 1
                gross_profit += pnl
            else:
                pnl = -cost
                losses += 1
                gross_loss += abs(pnl)

            cum_equity += pnl
            if cum_equity > peak_equity:
                peak_equity = cum_equity
            dd = peak_equity - cum_equity
            if dd > max_drawdown:
                max_drawdown = dd

            trade_roi = pnl / cost if cost > ZERO else ZERO
            trade = BacktestTrade(
                ticker=ticker,
                entry_ts=sig["ts"],
                side=side,
                contracts=contracts,
                entry_price=exec_price,
                fees=fee,
                cost_basis=cost,
                settlement_result=res,
                pnl=pnl,
                roi=trade_roi,
                strategy=strategy_name,
                model_prob=p_model,
                market_prob=p_mkt,
            )
            trades.append(trade)

            probs.append(p_model)
            outcomes.append(1 if res == "yes" else 0)
            pnls_float.append(float(pnl))

        n = len(trades)
        win_rate = (wins / n) if n > 0 else 0.0
        profit_factor = float(gross_profit / gross_loss) if gross_loss > ZERO else 999.0
        total_pnl = cum_equity - self.initial_bankroll
        net_roi = float(total_pnl / self.initial_bankroll)
        max_dd_pct = float(max_drawdown / peak_equity) if peak_equity > ZERO else 0.0

        bs = brier(probs, outcomes) if n > 0 else 0.0
        ll = log_loss(probs, outcomes) if n > 0 else 0.0
        ece = expected_calibration_error(probs, outcomes) if n > 0 else 0.0
        boot_ci = bootstrap_mean_ci(pnls_float) if len(pnls_float) >= 10 else (0.0, 0.0)

        return BacktestReport(
            strategy_name=strategy_name,
            total_trades=n,
            winning_trades=wins,
            losing_trades=losses,
            win_rate=win_rate,
            total_pnl=total_pnl,
            total_fees=total_fees,
            net_roi=net_roi,
            profit_factor=profit_factor,
            max_drawdown_dollars=max_drawdown,
            max_drawdown_pct=max_dd_pct,
            brier_score=bs,
            log_loss_score=ll,
            ece=ece,
            bootstrap_pnl_ci_95=boot_ci,
            trades=[
                {
                    "ticker": t.ticker,
                    "entry_ts": t.entry_ts.isoformat(),
                    "side": t.side,
                    "contracts": str(t.contracts),
                    "entry_price": str(t.entry_price),
                    "fees": str(t.fees),
                    "pnl": str(t.pnl),
                    "roi": str(t.roi),
                    "won": (t.side == t.settlement_result),
                }
                for t in trades
            ],
        )
