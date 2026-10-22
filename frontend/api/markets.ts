import { tryProxyToBackend } from './_backend.js';

interface CachedMarkets {
  ts: number;
  markets: any[];
}
let marketsCache: CachedMarkets | null = null;

function inferCategory(ticker: string, title?: string): string {
  const t = (ticker || '').toUpperCase();
  const tit = (title || '').toLowerCase();

  if (
    t.startsWith('KXHIGH') || 
    t.startsWith('KXLOW') || 
    t.startsWith('KXRAIN') || 
    t.startsWith('KXSNOW') || 
    t.startsWith('KXTEMP') ||
    tit.includes('temperature') ||
    tit.includes('weather') ||
    tit.includes('rain')
  ) {
    return 'Climate and Weather';
  }

  if (
    t.startsWith('KXBTC') || 
    t.startsWith('KXETH') || 
    t.startsWith('KXSOL') || 
    t.startsWith('KXXRP') || 
    t.startsWith('KXDOGE') || 
    t.includes('CRYPTO') ||
    tit.includes('bitcoin') ||
    tit.includes('ethereum')
  ) {
    return 'Crypto';
  }

  if (
    t.startsWith('KXNFL') || 
    t.startsWith('KXNBA') || 
    t.startsWith('KXMLB') || 
    t.startsWith('KXNHL') || 
    t.startsWith('KXNCAAF') || 
    t.startsWith('KXWNBA') || 
    t.startsWith('KXLIGA') ||
    tit.includes('nfl') ||
    tit.includes('nba') ||
    tit.includes('touchdown')
  ) {
    return 'Sports';
  }

  if (
    t.startsWith('KXFED') ||
    t.startsWith('KXCPI') ||
    t.startsWith('KXPAYROLLS') ||
    t.startsWith('KXINX') ||
    t.startsWith('KXGDP') ||
    t.startsWith('KX30Y') ||
    t.startsWith('KX2YR') ||
    t.startsWith('FED') || 
    t.startsWith('CPI') || 
    t.startsWith('INX') || 
    t.startsWith('JOB') || 
    t.startsWith('GDP') || 
    t.startsWith('RATE') ||
    tit.includes('federal reserve') ||
    tit.includes('interest rate') ||
    tit.includes('inflation') ||
    tit.includes('cpi') ||
    tit.includes('payroll') ||
    tit.includes('mortgage')
  ) {
    return 'Economics';
  }

  return 'General';
}

const TARGET_SERIES = [
  // Climate and Weather (Highs & Lows)
  'KXHIGHDEN', 'KXHIGHMIA', 'KXHIGHCHI', 'KXHIGHNY', 'KXHIGHLAX', 'KXHIGHAUS',
  'KXLOWDEN', 'KXLOWCHI', 'KXLOWMIA',
  // Digital Assets / Crypto
  'KXBTC', 'KXETH', 'KXDOGE', 'KXXRP',
  // Sports (NFL, NBA, NHL, MLB)
  'KXNFLGAME', 'KXNBAGAME', 'KXNHLGAME', 'KXMLBGAME',
  // Macroeconomics & Interest Rates
  'KXFED', 'KXCPI', 'KXPAYROLLS', 'KXINX', 'KXGDP', 'KX30YMORTW', 'KX2YRRATE15M'
];

async function fetchLiveKalshiMarkets(): Promise<any[]> {
  const now = Date.now();
  if (marketsCache && now - marketsCache.ts < 30000 && marketsCache.markets.length > 0) {
    return marketsCache.markets;
  }

  const allRawMarkets: any[] = [];
  const seenTickers = new Set<string>();

  // Fetch in parallel across target series and open markets
  const promises = TARGET_SERIES.map(async (series) => {
    try {
      const res = await fetch(
        `https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=${series}&status=open&limit=30`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const json = await res.json();
        return json.markets || [];
      }
    } catch {
      return [];
    }
    return [];
  });

  // Also query open markets
  const generalPromise = (async () => {
    try {
      const res = await fetch(
        'https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=100&mve_filter=exclude',
        { cache: 'no-store' }
      );
      if (res.ok) {
        const json = await res.json();
        return json.markets || [];
      }
    } catch {
      return [];
    }
    return [];
  })();

  const results = await Promise.all([...promises, generalPromise]);
  for (const list of results) {
    for (const m of list) {
      if (!seenTickers.has(m.ticker)) {
        seenTickers.add(m.ticker);
        allRawMarkets.push(m);
      }
    }
  }

  const formatted = allRawMarkets.map((m: any) => {
    const yesBid = m.yes_bid_dollars || (m.yes_bid ? (m.yes_bid / 100).toFixed(2) : null);
    const yesAsk = m.yes_ask_dollars || (m.yes_ask ? (m.yes_ask / 100).toFixed(2) : null);
    let spread: string | null = null;
    if (yesBid && yesAsk) {
      spread = (parseFloat(yesAsk) - parseFloat(yesBid)).toFixed(4);
    }

    const cat = inferCategory(m.ticker, m.title);

    return {
      ticker: m.ticker,
      title: m.title || m.ticker,
      yes_sub_title: m.yes_sub_title || null,
      category: cat,
      status: m.status || 'active',
      close_time: m.close_time || null,
      yes_bid: yesBid,
      yes_ask: yesAsk,
      spread,
      is_stale: false,
    };
  });

  marketsCache = { ts: now, markets: formatted };
  return formatted;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const category = req.query?.category;

  // 1. Try authoritative Python backend
  const backendQuery = category ? `/api/markets?category=${encodeURIComponent(category)}` : '/api/markets';
  const backendRes = await tryProxyToBackend(backendQuery);
  if (backendRes.proxied && backendRes.data && backendRes.data.markets?.length > 0) {
    return res.status(200).json(backendRes.data);
  }

  // 2. Authoritative live multi-series Kalshi discovery
  try {
    let markets = await fetchLiveKalshiMarkets();

    if (category && category !== 'ALL') {
      const catLower = String(category).toLowerCase();
      markets = markets.filter((m: any) =>
        m.category && m.category.toLowerCase().includes(catLower)
      );
    }

    return res.status(200).json({
      count: markets.length,
      markets,
    });
  } catch (e: any) {
    console.error('Error in markets handler', e);
    return res.status(200).json({ count: 0, markets: [] });
  }
}
