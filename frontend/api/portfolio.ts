import { tryProxyToBackend } from './_backend.js';
import { getKalshiCredentials, kalshiRequest } from './_kalshi.js';

let lastKnownPortfolio: any = null;

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // 1. Try authoritative Python backend
  const backendRes = await tryProxyToBackend('/api/portfolio');
  if (backendRes.proxied && backendRes.data) {
    return res.status(200).json(backendRes.data);
  }

  const creds = getKalshiCredentials(req);
  if (!creds) {
    if (lastKnownPortfolio) {
      return res.status(200).json(lastKnownPortfolio);
    }
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

  const [balRes, posRes, ordersRes, fillsRes] = await Promise.all([
    kalshiRequest('GET', '/portfolio/balance', undefined, creds),
    kalshiRequest('GET', '/portfolio/positions', undefined, creds),
    kalshiRequest('GET', '/portfolio/orders?limit=25', undefined, creds),
    kalshiRequest('GET', '/portfolio/fills?limit=25', undefined, creds),
  ]);

  if (!balRes.ok) {
    if (lastKnownPortfolio) {
      return res.status(200).json(lastKnownPortfolio);
    }
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
      resting_orders: [],
      orders: [],
      recent_fills: [],
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

    const contractsNum = posFp >= 100 ? (posFp / 100) : posFp;
    const avgEntry = contractsNum > 0 ? (exposure / contractsNum) : 0;
    const maxPayout = contractsNum * 1.0;
    const potentialProfit = Math.max(0, maxPayout - exposure);

    return {
      ticker: p.ticker,
      side: 'yes',
      contracts: contractsNum.toFixed(2),
      avg_entry: avgEntry.toFixed(4),
      avg_entry_cents: (avgEntry * 100).toFixed(1) + '¢',
      current_mid: null,
      unrealized_pnl: '0.00',
      cost_basis: exposure.toFixed(2),
      max_payout: maxPayout.toFixed(2),
      potential_profit: potentialProfit.toFixed(2),
      fees_paid: fees.toFixed(2),
      last_updated: p.last_updated_ts,
    };
  });

  // Process Orders
  const rawOrders = ordersRes.data?.orders || [];
  const orders = rawOrders.map((o: any) => {
    const countFp = parseFloat(o.count_fp || o.remaining_count_fp || '0');
    const count = countFp >= 100 ? (countFp / 100) : countFp;
    const priceDollars = parseFloat(o.yes_price_dollars || (o.yes_price ? (o.yes_price / 100).toFixed(4) : (o.price || '0')));
    return {
      order_id: o.order_id,
      ticker: o.ticker,
      side: (o.side || 'yes').toLowerCase(),
      action: (o.action || 'buy').toLowerCase(),
      status: o.status || 'resting',
      contracts: count.toFixed(2),
      price: priceDollars.toFixed(4),
      price_cents: (priceDollars * 100).toFixed(1) + '¢',
      created_time: o.created_time,
    };
  });

  const restingOrders = orders.filter((o: any) => o.status === 'resting');

  // Process Fills
  const rawFills = fillsRes.data?.fills || [];
  const recentFills = rawFills.map((f: any) => {
    const countFp = parseFloat(f.count_fp || '0');
    const count = countFp >= 100 ? (countFp / 100) : countFp;
    const priceDollars = parseFloat(f.yes_price_dollars || (f.yes_price ? (f.yes_price / 100).toFixed(4) : '0'));
    const feeDollars = parseFloat(f.fee_cost || '0');
    return {
      fill_id: f.fill_id,
      order_id: f.order_id,
      trade_id: f.trade_id,
      ticker: f.ticker,
      side: (f.side || 'yes').toLowerCase(),
      action: (f.action || 'buy').toLowerCase(),
      contracts: count.toFixed(2),
      price: priceDollars.toFixed(4),
      price_cents: (priceDollars * 100).toFixed(1) + '¢',
      fee: feeDollars.toFixed(4),
      total_cost: ((count * priceDollars) + feeDollars).toFixed(2),
      created_time: f.created_time,
    };
  });

  const result = {
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
    resting_orders: restingOrders,
    orders: orders.slice(0, 20),
    recent_fills: recentFills.slice(0, 20),
    status: 'verified_live',
    verified_at: new Date().toISOString(),
  };

  lastKnownPortfolio = result;
  return res.status(200).json(result);
}
