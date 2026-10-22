import { tryProxyToBackend } from './_backend.js';
import { getKalshiCredentials, kalshiRequest } from './_kalshi.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=5');

  // 1. Try authoritative Python backend
  const backendRes = await tryProxyToBackend('/api/portfolio');
  if (backendRes.proxied && backendRes.data) {
    return res.status(200).json(backendRes.data);
  }

  const creds = getKalshiCredentials(req);
  if (!creds) {
    return res.status(200).json({
      starting_bankroll: '0.00',
      available_cash: '0.00',
      total_equity: '0.00',
      total_open_risk: '0.00',
      unrealized_pnl: '0.00',
      realized_pnl: '0.00',
      total_fees: '0.00',
      drawdown_pct: '0.00',
      open_positions_count: 0,
      positions: [],
      status: 'unauthenticated',
      message: 'Authenticate Kalshi credentials to view live account ledger.',
    });
  }

  const [balRes, posRes] = await Promise.all([
    kalshiRequest('GET', '/portfolio/balance', undefined, creds),
    kalshiRequest('GET', '/portfolio/positions', undefined, creds),
  ]);

  if (!balRes.ok) {
    return res.status(200).json({
      starting_bankroll: '0.00',
      available_cash: '0.00',
      total_equity: '0.00',
      total_open_risk: '0.00',
      unrealized_pnl: '0.00',
      realized_pnl: '0.00',
      total_fees: '0.00',
      drawdown_pct: '0.00',
      open_positions_count: 0,
      positions: [],
      status: 'error',
      error: balRes.error,
    });
  }

  const balData = balRes.data || {};
  const cashDollars = parseFloat(balData.balance_dollars || (balData.balance ? (balData.balance / 100).toFixed(2) : '0.00'));
  const portValue = balData.portfolio_value ? balData.portfolio_value / 100.0 : 0.0;
  const totalEquity = cashDollars + portValue;

  const mPos = posRes.data?.market_positions || [];
  let totalFees = 0.0;
  let totalRealized = 0.0;

  const positions = mPos.map((p: any) => {
    const exposure = parseFloat(p.market_exposure_dollars || '0.00');
    const fees = parseFloat(p.fees_paid_dollars || '0.00');
    const realized = parseFloat(p.realized_pnl_dollars || '0.00');
    const posFp = parseFloat(p.position_fp || '0.00');

    totalFees += fees;
    totalRealized += realized;

    return {
      ticker: p.ticker,
      side: 'yes',
      contracts: posFp >= 100 ? (posFp / 100).toFixed(2) : posFp.toFixed(2),
      avg_entry: exposure.toFixed(2),
      current_mid: null,
      unrealized_pnl: '0.00',
      cost_basis: exposure.toFixed(2),
      fees_paid: fees.toFixed(2),
      last_updated: p.last_updated_ts,
    };
  });

  return res.status(200).json({
    starting_bankroll: totalEquity.toFixed(2),
    available_cash: cashDollars.toFixed(2),
    total_equity: totalEquity.toFixed(2),
    total_open_risk: portValue.toFixed(2),
    unrealized_pnl: '0.00',
    realized_pnl: totalRealized.toFixed(2),
    total_fees: totalFees.toFixed(2),
    drawdown_pct: '0.00',
    open_positions_count: positions.length,
    positions,
    status: 'verified_live',
    verified_at: new Date().toISOString(),
  });
}
