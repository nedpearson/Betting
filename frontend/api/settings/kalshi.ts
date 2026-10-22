import { getKalshiCredentials, kalshiRequest } from '../_kalshi.js';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const creds = getKalshiCredentials(req);
    if (!creds) {
      return res.status(200).json({
        connected: false,
        key_id: '',
        balance: null,
        mode: 'unauthenticated',
        message: 'No Kalshi credentials configured.',
      });
    }

    const result = await kalshiRequest('GET', '/portfolio/balance', undefined, creds);
    if (result.ok && result.data) {
      const b = result.data;
      const maskedKey = `${creds.keyId.slice(0, 8)}...${creds.keyId.slice(-4)}`;
      return res.status(200).json({
        connected: true,
        key_id: maskedKey,
        balance: b,
        balance_dollars: b.balance_dollars || (b.balance ? (b.balance / 100).toFixed(2) : '0.00'),
        portfolio_value_dollars: b.portfolio_value ? (b.portfolio_value / 100).toFixed(2) : '0.00',
        mode: 'live',
        verified_at: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      connected: false,
      key_id: '',
      balance: null,
      error: result.error,
      mode: 'unauthenticated',
    });
  }

  if (req.method === 'POST') {
    const { key_id, private_key } = req.body || {};
    if (!key_id || !private_key) {
      return res.status(400).json({
        success: false,
        connected: false,
        error: 'Key ID and Private Key are required',
      });
    }

    let privKey = private_key.trim();
    if (!privKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privKey = `-----BEGIN PRIVATE KEY-----\n${privKey}\n-----END PRIVATE KEY-----`;
    }

    const testCreds = { keyId: key_id.trim(), privateKeyPem: privKey };
    const result = await kalshiRequest('GET', '/portfolio/balance', undefined, testCreds);

    if (result.ok && result.data) {
      const b = result.data;
      return res.status(200).json({
        success: true,
        connected: true,
        key_id: `${testCreds.keyId.slice(0, 8)}...`,
        balance: b.balance,
        balance_dollars: b.balance_dollars || (b.balance ? (b.balance / 100).toFixed(2) : '0.00'),
        message: 'Kalshi account authenticated successfully with exchange!',
      });
    }

    return res.status(401).json({
      success: false,
      connected: false,
      error: result.error || 'Kalshi exchange rejected credentials',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
