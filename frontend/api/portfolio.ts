export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=5');
  return res.status(200).json({
    starting_bankroll: '500.00',
    available_cash: '500.00',
    total_equity: '500.00',
    total_open_risk: '0.00',
    unrealized_pnl: '0.00',
    realized_pnl: '0.00',
    total_fees: '0.00',
    drawdown_pct: '0.00',
    open_positions_count: 0,
    positions: [],
  });
}
