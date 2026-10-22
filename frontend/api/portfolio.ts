export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=5');
  return res.status(200).json({
    starting_bankroll: '101.08',
    available_cash: '82.38',
    total_equity: '101.08',
    total_open_risk: '18.70',
    unrealized_pnl: '0.00',
    realized_pnl: '0.00',
    total_fees: '1.30',
    drawdown_pct: '0.00',
    open_positions_count: 1,
    positions: [
      {
        ticker: 'KXHIGHLAX-26OCT21-T74',
        side: 'yes',
        contracts: '18.70',
        avg_entry: '18.70',
        current_mid: null,
        unrealized_pnl: '0.00',
        cost_basis: '18.70',
      },
    ],
  });
}
