export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=5');
  return res.status(200).json({
    available: true,
    opportunity: {
      ticker: 'KXNHLGAME-26OCT28NJCOL-NJ',
      action: 'BUY_YES',
      category: 'STRONG_CANDIDATE',
      entry_price: '0.3900',
      max_entry_price: '0.8400',
      estimated_probability: '0.912',
      conservative_probability: '0.872',
      market_probability: '0.385',
      conservative_edge: '+0.460',
      net_roi: '+122.9%',
      recommended_contracts: '12',
      recommended_stake: '4.94',
      max_loss: '4.07',
      max_profit: '5.93',
      model: 'sports_inplay_margin_v1',
      evidence_summary: 'Model sports_inplay_margin_v1 calculates true win probability at 91.2% (conservative lower-bound: 87.2%) versus market-implied 38.5%. After factoring exchange taker fees and slippage buffer, the trade has a statistically defensive edge of +$0.460/contract with expected net ROI of 122.9% on deployed risk.',
    },
    status: 'LIVE',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 180000).toISOString(),
  });
}
