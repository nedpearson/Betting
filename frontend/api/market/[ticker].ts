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
      fetch(`https://api.elections.kalshi.com/trade-api/v2/markets/${encodeURIComponent(ticker)}/orderbook?depth=30`, { cache: 'no-store' }),
    ]);

    let marketData: any = {};
    let orderbookData: any = {};

    if (mktRes.status === 'fulfilled' && mktRes.value.ok) {
      marketData = (await mktRes.value.json()).market || {};
    }

    if (obRes.status === 'fulfilled' && obRes.value.ok) {
      orderbookData = (await obRes.value.json()).orderbook || {};
    }

    // Derive YES ask from NO bid complement
    const noBids = orderbookData.no || [];
    let derivedYesAsk = null;

    if (noBids.length > 0) {
      const bestNoBid = parseFloat(noBids[0][0]);
      derivedYesAsk = (1.0 - bestNoBid).toFixed(4);
    }

    return res.status(200).json({
      ticker,
      market: marketData,
      orderbook: orderbookData,
      derived_yes_ask: derivedYesAsk,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
