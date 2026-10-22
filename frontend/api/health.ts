import { tryProxyToBackend } from './_backend';

interface PingResult {
  ok: boolean;
  latency: number;
  error: string | null;
}

async function pingUrl(url: string, headers: Record<string, string> = {}): Promise<PingResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);
    return {
      ok: resp.ok,
      latency: Date.now() - start,
      error: resp.ok ? null : `HTTP ${resp.status}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err.message || 'Request failed',
    };
  }
}

export default async function handler(req: any, res: any) {
  // 1. Try authoritative Python backend
  const backendRes = await tryProxyToBackend('/api/health');
  if (backendRes.proxied && backendRes.data) {
    res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=5');
    return res.status(200).json(backendRes.data);
  }

  // 2. Measure genuine live latencies to external providers
  const [kalshiPing, coinbasePing, weatherPing, noaaPing] = await Promise.all([
    pingUrl('https://api.elections.kalshi.com/trade-api/v2/exchange/status'),
    pingUrl('https://api.exchange.coinbase.com/products/BTC-USD/ticker'),
    pingUrl('https://api.open-meteo.com/v1/forecast?latitude=34.05&longitude=-118.24&current_weather=true'),
    pingUrl('https://api.weather.gov/', { 'User-Agent': 'BettingIntelligenceOS/1.0' }),
  ]);

  const nowIso = new Date().toISOString();

  const feeds = [
    {
      name: 'kalshi_rest',
      description: 'Kalshi Production REST API',
      state: kalshiPing.ok ? 'CONNECTED' : 'DISCONNECTED',
      transport: 'rest',
      age_sec: 0.1,
      stale_after_sec: 60.0,
      last_update_utc: nowIso,
      latency_ms_p50: kalshiPing.latency,
      reliability: kalshiPing.ok ? 1.0 : 0.0,
      messages_total: 1,
      errors_total: kalshiPing.ok ? 0 : 1,
      last_error: kalshiPing.error,
      licensing_note: 'CFTC-regulated exchange official API',
      settlement_grade: true,
    },
    {
      name: 'crypto_coinbase',
      description: 'Coinbase Exchange Spot Market Data',
      state: coinbasePing.ok ? 'CONNECTED' : 'DISCONNECTED',
      transport: 'rest_poll',
      age_sec: 0.1,
      stale_after_sec: 30.0,
      last_update_utc: nowIso,
      latency_ms_p50: coinbasePing.latency,
      reliability: coinbasePing.ok ? 1.0 : 0.0,
      messages_total: 1,
      errors_total: coinbasePing.ok ? 0 : 1,
      last_error: coinbasePing.error,
      licensing_note: 'Coinbase Public Market Data API (proxy for CF Benchmarks)',
      settlement_grade: false,
    },
    {
      name: 'weather_openmeteo',
      description: 'Open-Meteo Ensemble Weather API',
      state: weatherPing.ok ? 'CONNECTED' : 'DISCONNECTED',
      transport: 'rest_poll',
      age_sec: 0.1,
      stale_after_sec: 1800.0,
      last_update_utc: nowIso,
      latency_ms_p50: weatherPing.latency,
      reliability: weatherPing.ok ? 1.0 : 0.0,
      messages_total: 1,
      errors_total: weatherPing.ok ? 0 : 1,
      last_error: weatherPing.error,
      licensing_note: 'Open-Meteo open weather models',
      settlement_grade: false,
    },
    {
      name: 'weather_noaa',
      description: 'NOAA / National Weather Service API',
      state: noaaPing.ok ? 'CONNECTED' : 'DISCONNECTED',
      transport: 'rest_poll',
      age_sec: 0.1,
      stale_after_sec: 1800.0,
      last_update_utc: nowIso,
      latency_ms_p50: noaaPing.latency,
      reliability: noaaPing.ok ? 1.0 : 0.0,
      messages_total: 1,
      errors_total: noaaPing.ok ? 0 : 1,
      last_error: noaaPing.error,
      licensing_note: 'US National Weather Service public domain',
      settlement_grade: true,
    },
  ];

  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=5');
  return res.status(200).json({
    status: kalshiPing.ok ? 'online' : 'degraded',
    utc_time: nowIso,
    feeds,
  });
}
