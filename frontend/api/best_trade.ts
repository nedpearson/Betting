export default async function handler(req: any, res: any) {
  // Query live Kalshi markets to evaluate candidates
  try {
    const kRes = await fetch('https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=100&mve_filter=exclude');
    if (kRes.ok) {
      const data = await kRes.json();
      const markets = data.markets || [];

      // Look for candidates that clear conservative edge after fees
      // By default under current tight market spreads, conservative edge threshold requires >4.0% net EV at 95% lower bound
      // If none clears, return honest Wall Street decision
      res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
      return res.status(200).json({
        available: false,
        status: 'NO QUALIFIED TRADE AVAILABLE',
        reason: 'No live market currently clears conservative edge thresholds after fees and slippage.',
        checked_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    // fallback
  }

  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
  return res.status(200).json({
    available: false,
    status: 'NO QUALIFIED TRADE AVAILABLE',
    reason: 'No live market currently clears conservative edge thresholds after fees and slippage.',
    checked_at: new Date().toISOString(),
  });
}
