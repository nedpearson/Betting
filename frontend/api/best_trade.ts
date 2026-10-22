import { tryProxyToBackend } from './_backend.js';
import { evaluateLiveMarkets } from './_eval.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // 1. Try authoritative Python backend if connected
  const backendRes = await tryProxyToBackend('/api/best_trade');
  if (backendRes.proxied && backendRes.data) {
    return res.status(200).json(backendRes.data);
  }

  // 2. Authoritative live evaluation on Kalshi open order books
  const { bestTrade, reason } = await evaluateLiveMarkets();

  if (bestTrade) {
    return res.status(200).json({
      available: true,
      opportunity: bestTrade,
      status: 'LIVE',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 180000).toISOString(),
    });
  }

  return res.status(200).json({
    available: false,
    status: 'NO QUALIFIED LIVE TRADE AVAILABLE',
    reason: reason || 'Evaluated live open Kalshi markets. No market currently clears conservative edge thresholds (> +$0.03/contract) after quadratic taker fees and slippage.',
    checked_at: new Date().toISOString(),
  });
}
