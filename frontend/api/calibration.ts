import { tryProxyToBackend } from './_backend';

export default async function handler(req: any, res: any) {
  // 1. Try authoritative Python backend
  const backendRes = await tryProxyToBackend('/api/calibration');
  if (backendRes.proxied && backendRes.data) {
    res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15');
    return res.status(200).json(backendRes.data);
  }

  // 2. Truthful un-audited state (no synthetic Brier scores or fake log loss)
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
  return res.status(200).json({
    resolved_count: 0,
    status: 'UNAUDITED',
    note: 'Awaiting out-of-sample resolution history. No simulated calibration metrics are represented as live.',
  });
}
