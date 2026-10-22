import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tryProxyToBackend } from './_backend';
import { getKalshiCredentials, kalshiRequest } from './_kalshi';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Try authoritative Python backend
  const backendRes = await tryProxyToBackend('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });
  if (backendRes.proxied && backendRes.data) {
    return res.status(backendRes.status || 200).json(backendRes.data);
  }

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
    return res.status(result.status || 400).json({
      success: false,
      status: 'REJECTED',
      reason: `Kalshi Exchange Rejection: ${result.error}`,
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
