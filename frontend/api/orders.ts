import { tryProxyToBackend } from './_backend.js';
import { getKalshiCredentials, kalshiRequest } from './_kalshi.js';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. If authoritative Python backend is configured, route strictly through it
  const backendRes = await tryProxyToBackend('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });

  if (backendRes.configured) {
    if (backendRes.proxied && backendRes.data) {
      return res.status(backendRes.status || 200).json(backendRes.data);
    }
    // Prevent silent fallback on critical mutating operations when authoritative backend is configured
    return res.status(backendRes.status || 502).json({
      success: false,
      status: 'BACKEND_ERROR',
      reason: backendRes.error || 'Authoritative backend execution failed or timed out',
    });
  }

  // 2. Direct serverless execution path (when standalone serverless mode is active)
  const { ticker, side, contracts, limit_price, recommendation_id } = req.body || {};

  if (!ticker || !side || !contracts || !limit_price) {
    return res.status(400).json({
      success: false,
      status: 'REJECTED',
      reason: 'Missing required order parameters (ticker, side, contracts, limit_price)',
    });
  }

  const creds = getKalshiCredentials(req);
  if (!creds) {
    return res.status(403).json({
      success: false,
      status: 'REJECTED',
      reason: 'Authentication Required: Kalshi API credentials (Key ID and Private Key) are not configured or provided.',
    });
  }

  // Format per Kalshi Trade API v2 CreateOrderV2Request specification:
  // Book side: "bid" for YES, "ask" for NO
  const bookSide = side.toLowerCase() === 'yes' ? 'bid' : 'ask';
  const countFp = parseFloat(contracts).toFixed(2);
  const priceFp = parseFloat(limit_price).toFixed(4);
  const clientOrderId = crypto.randomUUID();

  const payload = {
    ticker,
    client_order_id: clientOrderId,
    side: bookSide,
    count: countFp,
    price: priceFp,
    time_in_force: 'good_till_canceled',
    self_trade_prevention_type: 'taker_at_cross',
    post_only: false,
  };

  const result = await kalshiRequest('POST', '/portfolio/events/orders', payload, creds);

  if (!result.ok) {
    const errMsg = (result.error || '').toLowerCase();
    const rawMsg = JSON.stringify(result.data || '').toLowerCase();
    let balanceContext: any = null;

    // Strong authorization safeguard: Do NOT automatically move funds across shards without user consent.
    // Instead, inspect shard distribution to provide transparent diagnostic guidance.
    if (errMsg.includes('insufficient balance') || rawMsg.includes('insufficient balance')) {
      try {
        const balRes = await kalshiRequest('GET', '/portfolio/balance', undefined, creds);
        if (balRes.ok && balRes.data) {
          const rawBal = balRes.data.balance ?? 0;
          const breakdowns = balRes.data.balance_breakdown || [];
          balanceContext = {
            total_cash_dollars: (Number(rawBal) / 100).toFixed(2),
            shard_breakdown: breakdowns.map((b: any) => ({
              exchange_shard: b.exchange_index,
              balance_dollars: (Number(b.balance || 0) / 100).toFixed(2),
            })),
            remediation: 'Available balance on primary execution shard (shard 0) is insufficient for this order size. Please reduce contract quantity or transfer funds manually in the Kalshi member console.',
          };
        }
      } catch (balErr) {
        console.warn('Failed to retrieve balance diagnostics:', balErr);
      }
    }

    return res.status(result.status || 400).json({
      success: false,
      status: 'REJECTED',
      reason: `Kalshi Exchange Rejection: ${result.error}`,
      balance_diagnostics: balanceContext,
      raw_error: result.data,
    });
  }

  const exOrder = result.data?.order || {};
  return res.status(200).json({
    success: true,
    status: exOrder.status || 'resting',
    order_id: exOrder.order_id || clientOrderId,
    ticker,
    side,
    contracts: String(contracts),
    price: priceFp,
    filled: exOrder.fill_count_fp || '0',
    fees: exOrder.taker_fees_dollars || '0',
    mode: 'live',
    recommendation_id,
    exchange_response: exOrder,
    message: `Order submitted to Kalshi: ${contracts}x ${ticker} ${side.toUpperCase()} at $${priceFp} (Status: ${exOrder.status})`,
  });
}
