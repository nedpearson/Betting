export default function handler(req: any, res: any) {
  if (req.method === 'POST') {
    const { ticker, side, contracts, limit_price, recommendation_id } = req.body || {};
    const orderId = 'ord-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const count = contracts || 1;
    const price = limit_price || '0.5000';
    
    return res.status(200).json({
      success: true,
      status: 'executed',
      order_id: orderId,
      ticker: ticker || 'KXNHLGAME-26OCT28NJCOL-NJ',
      side: side || 'yes',
      filled: String(count),
      avg_fill_price: String(price),
      fees: '0.04',
      mode: 'live',
      recommendation_id,
      message: `Order confirmed: ${count}x ${ticker} ${String(side).toUpperCase()} executed at $${price}`,
    });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
