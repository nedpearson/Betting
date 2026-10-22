import { tryProxyToBackend } from './_backend.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const category = req.query?.category;

  // 1. Try authoritative Python backend
  const backendQuery = category ? `/api/markets?category=${encodeURIComponent(category)}` : '/api/markets';
  const backendRes = await tryProxyToBackend(backendQuery);
  if (backendRes.proxied && backendRes.data) {
    return res.status(200).json(backendRes.data);
  }

  // 2. Authoritative live Kalshi market discovery
  try {
    const kRes = await fetch('https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=100&mve_filter=exclude', {
      cache: 'no-store',
    });
    if (kRes.ok) {
      const data = await kRes.json();
      const rawMarkets = data.markets || [];

      let formatted = rawMarkets.map((m: any) => {
        const yesBid = m.yes_bid_dollars || (m.yes_bid ? (m.yes_bid / 100).toFixed(2) : null);
        const yesAsk = m.yes_ask_dollars || (m.yes_ask ? (m.yes_ask / 100).toFixed(2) : null);
        let spread: string | null = null;
        if (yesBid && yesAsk) {
          spread = (parseFloat(yesAsk) - parseFloat(yesBid)).toFixed(4);
        }

        return {
          ticker: m.ticker,
          title: m.title || m.ticker,
          yes_sub_title: m.yes_sub_title || null,
          category: m.category || null,
          status: m.status || 'active',
          close_time: m.close_time || null,
          yes_bid: yesBid,
          yes_ask: yesAsk,
          spread,
          is_stale: false,
        };
      });

      if (category && category !== 'ALL') {
        formatted = formatted.filter((m: any) => 
          m.category && m.category.toLowerCase().includes(String(category).toLowerCase())
        );
      }

      return res.status(200).json({
        count: formatted.length,
        markets: formatted,
      });
    }
  } catch (e: any) {
    console.error('Error fetching markets from Kalshi', e);
  }

  return res.status(200).json({ count: 0, markets: [] });
}
