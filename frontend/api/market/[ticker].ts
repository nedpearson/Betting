import { tryProxyToBackend } from '../_backend.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { ticker } = req.query;
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  // 1. Try authoritative Python backend
  const backendRes = await tryProxyToBackend(`/api/market/${encodeURIComponent(ticker)}`);
  if (backendRes.proxied && backendRes.data) {
    return res.status(200).json(backendRes.data);
  }

  // 2. Authoritative live Kalshi market & order book fetch
  try {
    const [mktRes, obRes] = await Promise.allSettled([
      fetch(`https://api.elections.kalshi.com/trade-api/v2/markets/${encodeURIComponent(ticker)}`, { cache: 'no-store' }),
      fetch(`https://api.elections.kalshi.com/trade-api/v2/markets/${encodeURIComponent(ticker)}/orderbook?depth=50`, { cache: 'no-store' }),
    ]);

    let marketData: any = {};
    let rawOb: any = {};

    if (mktRes.status === 'fulfilled' && mktRes.value.ok) {
      marketData = (await mktRes.value.json()).market || {};
    }

    if (obRes.status === 'fulfilled' && obRes.value.ok) {
      const obJson = await obRes.value.json();
      rawOb = obJson.orderbook_fp || obJson.orderbook || {};
    }

    // Standardize orderbook bids and asks
    const yesBids = rawOb.yes_dollars || rawOb.yes || [];
    const noBids = rawOb.no_dollars || rawOb.no || [];

    // Derive YES asks from NO bids (Price_Yes_Ask = 1.0 - Price_No_Bid)
    const derivedYesAsks = noBids.map(([price, count]: [string, string]) => {
      const p = parseFloat(price);
      return [(1.0 - p).toFixed(4), count];
    }).sort((a: any, b: any) => parseFloat(a[0]) - parseFloat(b[0]));

    return res.status(200).json({
      ticker,
      title: marketData.title || ticker,
      category: marketData.category || null,
      market: marketData,
      orderbook: {
        yes_bids: yesBids,
        no_bids: noBids,
        yes_asks: derivedYesAsks,
      },
      volume_24h: marketData.volume_24h_fp || '0',
      volume_total: marketData.volume_fp || '0',
      open_interest: marketData.open_interest_fp || '0',
      rules_primary: marketData.rules_primary || '',
      rules_secondary: marketData.rules_secondary || '',
      close_time: marketData.close_time || null,
      expiration_time: marketData.expiration_time || null,
      yes_bid: marketData.yes_bid_dollars || (marketData.yes_bid ? (marketData.yes_bid / 100).toFixed(2) : null),
      yes_ask: marketData.yes_ask_dollars || (marketData.yes_ask ? (marketData.yes_ask / 100).toFixed(2) : null),
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
