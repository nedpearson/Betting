import type {
  BestTradeResponse,
  Opportunity,
  Market,
  AgentSnapshot,
  FeedHealth,
  PortfolioSummary,
  CalibrationReport,
} from './types';

const BASE = '';

async function fetchNoCache(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      ...(init?.headers || {}),
    },
  });
}

export async function fetchBestTrade(): Promise<BestTradeResponse> {
  const res = await fetchNoCache(`${BASE}/api/best_trade?_t=${Date.now()}`);
  return res.json();
}

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const res = await fetchNoCache(`${BASE}/api/opportunities?_t=${Date.now()}`);
  const data = await res.json();
  return data.opportunities || [];
}

export async function fetchMarkets(category?: string): Promise<Market[]> {
  const query = category ? `category=${encodeURIComponent(category)}&_t=${Date.now()}` : `_t=${Date.now()}`;
  const url = `${BASE}/api/markets?${query}`;
  const res = await fetchNoCache(url);
  const data = await res.json();
  return data.markets || [];
}

export async function fetchMarketDetail(ticker: string): Promise<any> {
  const res = await fetchNoCache(`${BASE}/api/market/${encodeURIComponent(ticker)}?_t=${Date.now()}`);
  return res.json();
}

export async function fetchAgents(): Promise<AgentSnapshot[]> {
  const res = await fetchNoCache(`${BASE}/api/agents?_t=${Date.now()}`);
  const data = await res.json();
  return data.agents || [];
}

export async function fetchPortfolio(): Promise<PortfolioSummary> {
  const res = await fetchNoCache(`${BASE}/api/portfolio?_t=${Date.now()}`);
  return res.json();
}

export async function fetchHealth(): Promise<FeedHealth[]> {
  const res = await fetchNoCache(`${BASE}/api/health?_t=${Date.now()}`);
  const data = await res.json();
  return data.feeds || [];
}

export async function fetchCalibration(): Promise<CalibrationReport> {
  const res = await fetchNoCache(`${BASE}/api/calibration?_t=${Date.now()}`);
  return res.json();
}

export async function fetchSettings(): Promise<any> {
  const res = await fetchNoCache(`${BASE}/api/settings?_t=${Date.now()}`);
  return res.json();
}

export async function triggerKillSwitch(): Promise<any> {
  const res = await fetchNoCache(`${BASE}/api/kill_switch`, { method: 'POST' });
  return res.json();
}

export async function placeOrder(
  ticker: string,
  side: 'yes' | 'no',
  contracts: number,
  limitPrice: number,
  recommendationId?: string
): Promise<any> {
  const res = await fetchNoCache(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker,
      side,
      contracts,
      limit_price: limitPrice.toFixed(4),
      recommendation_id: recommendationId,
    }),
  });
  return res.json();
}

export function subscribeEventStream(
  onEvent: (type: string, data: any) => void
): () => void {
  const es = new EventSource(`${BASE}/api/stream`);

  es.onmessage = (e) => {
    try {
      const parsed = JSON.parse(e.data);
      onEvent('message', parsed);
    } catch {
      // heartbeats or control messages
    }
  };

  es.addEventListener('recommendation.issued', (e: any) => {
    try {
      onEvent('recommendation.issued', JSON.parse(e.data));
    } catch {}
  });

  es.addEventListener('recommendation.invalidated', (e: any) => {
    try {
      onEvent('recommendation.invalidated', JSON.parse(e.data));
    } catch {}
  });

  es.addEventListener('ui.ticks', (e: any) => {
    try {
      onEvent('ui.ticks', JSON.parse(e.data));
    } catch {}
  });

  es.addEventListener('fill', (e: any) => {
    try {
      onEvent('fill', JSON.parse(e.data));
    } catch {}
  });

  es.addEventListener('safety.halt', (e: any) => {
    try {
      onEvent('safety.halt', JSON.parse(e.data));
    } catch {}
  });

  return () => {
    es.close();
  };
}
