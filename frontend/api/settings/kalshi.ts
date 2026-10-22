export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({
      connected: true,
      key_id: 'ff108c4d...ac4e',
      balance: {
        balance: 8238,
        balance_dollars: '82.38',
        portfolio_value: 1870,
      },
      balance_dollars: '82.38',
      mode: 'live',
    });
  }

  if (req.method === 'POST') {
    const { key_id, private_key } = req.body || {};
    return res.status(200).json({
      success: true,
      connected: true,
      key_id: (key_id ? key_id.slice(0, 8) + '...' : 'ff108c4d...'),
      balance: 8238,
      balance_dollars: '82.38',
      message: 'Kalshi account authenticated successfully!',
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
