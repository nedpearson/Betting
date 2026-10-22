"""Unit tests for Portfolio Risk Manager independent veto and sizing caps."""

from decimal import Decimal

import pytest

from boi.agents.risk_manager import PortfolioRiskManagerAgent
from boi.config import Settings
from boi.db import Database
from boi.ev import TradeEvaluation
from boi.events import EventBus
from boi.money import ZERO


@pytest.fixture
async def risk_agent():
    settings = Settings(
        bankroll=Decimal("500"),
        max_trade_risk_pct=Decimal("0.01"),  # $5 max risk
        max_open_risk_pct=Decimal("0.10"),  # $50 max open risk
        max_daily_loss_pct=Decimal("0.03"),  # $15 max daily loss
        max_drawdown_pct=Decimal("0.10"),  # $50 max drawdown
        kelly_fraction=Decimal("0.25"),
    )
    db = Database("sqlite+aiosqlite:///:memory:")
    await db.create_all()
    bus = EventBus(db=db)
    agent = PortfolioRiskManagerAgent(bus=bus, db=db, settings=settings)
    yield agent
    await db.close()


def make_eval(p_cons: Decimal = Decimal("0.70"), cost: Decimal = Decimal("0.50")):
    return TradeEvaluation(
        side="yes",
        contracts=Decimal("10"),
        top_price=Decimal("0.50"),
        avg_fill_price=Decimal("0.50"),
        fill_complete=True,
        p_point=Decimal("0.75"),
        p_conservative=p_cons,
        p_market=Decimal("0.50"),
        fees_total=Decimal("0.17"),
        fee_per_contract=Decimal("0.017"),
        slippage_buffer_per_contract=Decimal("0.005"),
        cost_per_contract=cost,
        break_even_prob=cost,
        gross_ev_per_contract=Decimal("0.25"),
        net_ev_per_contract=Decimal("0.23"),
        conservative_ev_per_contract=p_cons - cost,
        net_roi=Decimal("0.46"),
        conservative_roi=Decimal("0.40"),
        edge_vs_break_even=Decimal("0.25"),
        max_loss=Decimal("5.00"),
        max_profit=Decimal("5.00"),
        stress_ev=Decimal("1.50"),
        fill_levels=[("0.50", "10")],
    )


@pytest.mark.asyncio
async def test_risk_caps_at_1_percent(risk_agent):
    evaluation = make_eval(p_cons=Decimal("0.70"), cost=Decimal("0.50"))
    decision = risk_agent.evaluate_trade(
        ticker="TEST-TICKER",
        action="BUY_YES",
        evaluation=evaluation,
    )
    assert decision.approved
    # Bankroll = $500 -> 1% cap is $5.00. Cost per contract is $0.50 -> max 10 contracts ($5.00 risk)
    assert decision.approved_risk_dollars <= Decimal("5.00")
    assert decision.approved_contracts == Decimal("10")


@pytest.mark.asyncio
async def test_risk_veto_on_daily_loss(risk_agent):
    # Simulate $16 daily loss (over the $15 limit)
    risk_agent.daily_loss = Decimal("16.00")
    evaluation = make_eval()
    decision = risk_agent.evaluate_trade(
        ticker="TEST-TICKER",
        action="BUY_YES",
        evaluation=evaluation,
    )
    assert not decision.approved
    assert "Daily loss" in decision.veto_reason


@pytest.mark.asyncio
async def test_risk_veto_on_safety_halt(risk_agent):
    risk_agent.trigger_safety_halt("Test halt")
    evaluation = make_eval()
    decision = risk_agent.evaluate_trade(
        ticker="TEST-TICKER",
        action="BUY_YES",
        evaluation=evaluation,
    )
    assert not decision.approved
    assert "halted" in decision.veto_reason
