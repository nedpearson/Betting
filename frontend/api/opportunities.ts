import { tryProxyToBackend } from './_backend.js';
import { evaluateLiveMarkets } from './_eval.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=5');

  // 1. Try authoritative Python backend if connected
  const backendRes = await tryProxyToBackend('/api/opportunities');
  if (backendRes.proxied && backendRes.data) {
    return res.status(200).json(backendRes.data);
  }

  // 2. Authoritative live evaluation on Kalshi open order books
  const { opportunities } = await evaluateLiveMarkets();

  return res.status(200).json({
    count: opportunities.length,
    opportunities,
    checked_at: new Date().toISOString(),
  });
}
