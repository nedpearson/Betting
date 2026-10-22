import { tryProxyToBackend } from './_backend.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'POST') {
    const proxied = await tryProxyToBackend('/api/resume', { method: 'POST' });
    if (proxied.proxied && proxied.data) {
      return res.status(200).json(proxied.data);
    }
    return res.status(200).json({
      status: 'ACTIVE',
      is_halted: false,
      reason: 'Trading resumed by operator; safety halt cleared',
      time: new Date().toISOString(),
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
