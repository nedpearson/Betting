import { tryProxyToBackend } from './_backend.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // 1. Try authoritative Python backend
  const backendRes = await tryProxyToBackend('/api/calibration');
  if (backendRes.proxied && backendRes.data) {
    return res.status(200).json(backendRes.data);
  }

  // 2. Truthful un-audited state (no synthetic Brier scores or fake log loss)
  return res.status(200).json({
    resolved_count: 0,
    status: 'UNAUDITED',
    note: 'Awaiting out-of-sample resolution history. No simulated calibration metrics are represented as live.',
  });
}
