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

export async function fetchBestTrade(): Promise<BestTradeResponse> {
  const res = await fetch(`${BASE}/api/best_trade`);
  return res.json();
}

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const res = await fetch(`${BASE}/api/opportunities`);
  const data = await res.json();
  return data.opportunities || [];
}

export async function fetchMarkets(category?: string): Promise<Market[]> {
  const url = category ? `${BASE}/api/markets?category=${encodeURIComponent(category)}` : `${BASE}/api/markets`;
  const res = await fetch(url);
  const data = await res.json();
  return data.markets || [];
}

export async function fetchMarketDetail(ticker: string): Promise<any> {
  const res = await fetch(`${BASE}/api/market/${encodeURIComponent(ticker)}`);
  return res.json();
}

export async function fetchAgents(): Promise<AgentSnapshot[]> {
  const res = await fetch(`${BASE}/api/agents`);
  const data = await res.json();
  return data.agents || [];
}

export async function fetchPortfolio(): Promise<PortfolioSummary> {
  const res = await fetch(`${BASE}/api/portfolio`);
  return res.json();
}

export async function fetchHealth(): Promise<FeedHealth[]> {
  const res = await fetch(`${BASE}/api/health`);
  const data = await res.json();
  return data.feeds || [];
}

export async function fetchCalibration(): Promise<CalibrationReport> {
  const res = await fetch(`${BASE}/api/calibration`);
  return res.json();
}

export async function fetchSettings(): Promise<any> {
  const res = await fetch(`${BASE}/api/settings`);
  return res.json();
}

export async function triggerKillSwitch(): Promise<any> {
  const res = await fetch(`${BASE}/api/kill_switch`, { method: 'POST' });
  return res.json();
}

export async function placeOrder(
  ticker: string,
  side: 'yes' | 'no',
  contracts: number,
  limitPrice: number,
  recommendationId?: string
): Promise<any> {
  const res = await fetch(`${BASE}/api/orders`, {
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
