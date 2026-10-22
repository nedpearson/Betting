import { tryProxyToBackend } from './_backend.js';

let isHaltedMemory = false;
let haltReasonMemory: string | null = null;

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'GET') {
    const proxied = await tryProxyToBackend('/api/kill_switch');
    if (proxied.proxied && proxied.data) {
      return res.status(200).json(proxied.data);
    }
    return res.status(200).json({
      status: isHaltedMemory ? 'HALTED' : 'ACTIVE',
      is_halted: isHaltedMemory,
      reason: haltReasonMemory,
      time: new Date().toISOString(),
    });
  }

  if (req.method === 'POST') {
    const proxied = await tryProxyToBackend('/api/kill_switch', { method: 'POST' });
    isHaltedMemory = true;
    haltReasonMemory = 'Manual kill switch activated via terminal interface';
    if (proxied.proxied && proxied.data) {
      return res.status(200).json(proxied.data);
    }
    return res.status(200).json({
      status: 'HALTED',
      is_halted: true,
      time: new Date().toISOString(),
      reason: haltReasonMemory,
    });
  }

  if (req.method === 'DELETE') {
    const proxied = await tryProxyToBackend('/api/resume', { method: 'POST' });
    isHaltedMemory = false;
    haltReasonMemory = null;
    if (proxied.proxied && proxied.data) {
      return res.status(200).json(proxied.data);
    }
    return res.status(200).json({
      status: 'ACTIVE',
      is_halted: false,
      time: new Date().toISOString(),
      reason: 'Trading resumed by operator; safety halt cleared',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
