export default async function handler(req: any, res: any) {
  const { ticker } = req.query;
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  try {
    const [mktRes, obRes] = await Promise.allSettled([
      fetch(`https://api.elections.kalshi.com/trade-api/v2/markets/${encodeURIComponent(ticker)}`),
      fetch(`https://api.elections.kalshi.com/trade-api/v2/markets/${encodeURIComponent(ticker)}/orderbook?depth=30`),
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
    let yesBids = orderbookData.yes || [];
    let noBids = orderbookData.no || [];
    let derivedYesAsk = null;

    if (noBids.length > 0) {
      const bestNoBid = parseFloat(noBids[0][0]);
      derivedYesAsk = (1.0 - bestNoBid).toFixed(4);
    }

    res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=5');
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
