import { tryProxyToBackend } from './_backend.js';

const AGENT_DEFINITIONS = [
  { name: 'Agent-01-MarketDiscovery', role: 'Market Discovery & Universe Selection' },
  { name: 'Agent-02-LiveMarketMonitor', role: 'Sub-Second Order Book & Ticks Monitor' },
  { name: 'Agent-03-SportsIntelligence', role: 'Live Game State & Stern (1994) Brownian Motion' },
  { name: 'Agent-04-CryptoIntelligence', role: 'Coinbase Spot Realized EWMA Volatility' },
  { name: 'Agent-05-EconomicIntelligence', role: 'BLS / FRED Macro Release Forecaster' },
  { name: 'Agent-06-WeatherIntelligence', role: 'Open-Meteo Ensemble & NWS Integer °F Settlement' },
  { name: 'Agent-07-NewsVerification', role: 'Authoritative RSS Wire & SHA-256 Deduplication' },
  { name: 'Agent-08-QuantitativeForecasting', role: 'Multi-Model Probability Ensembles & Bootstrap CI' },
  { name: 'Agent-09-MarketMicrostructure', role: 'Multi-Tier Price Grid & Depth Impact Engine' },
  { name: 'Agent-10-ExpectedValueAnalyst', role: 'Exact Quadratic Fee Deduction & Net ROI Solver' },
  { name: 'Agent-11-PortfolioRiskManager', role: 'Hard Risk Limits & Absolute Trade VETO Power' },
  { name: 'Agent-12-TradeExecutionAdvisor', role: 'Execution Routing & Paper Fill Simulator' },
  { name: 'Agent-13-ModelValidation', role: 'Out-of-Sample Calibration (Brier, Log-Loss, ECE)' },
  { name: 'Agent-14-BehavioralRisk', role: 'Anti-Revenge Trading & Post-Loss Cool-Offs' },
  { name: 'Agent-15-SystemReliability', role: 'Token Bucket Rate Limits & P50/P95 Latency' },
  { name: 'Agent-16-ChiefInvestmentOfficer', role: 'Master Multi-Agent Coordinator & Best Trade Gate' },
];

export default async function handler(req: any, res: any) {
  // 1. Try authoritative Python backend
  const backendRes = await tryProxyToBackend('/api/agents');
  if (backendRes.proxied && backendRes.data) {
    res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=5');
    return res.status(200).json(backendRes.data);
  }

  // 2. Truthful standalone status when persistent swarm is local or offline
  const nowIso = new Date().toISOString();
  const agents = AGENT_DEFINITIONS.map((def) => ({
    name: def.name,
    role: def.role,
    status: 'STANDBY',
    last_active_utc: nowIso,
    decisions_count: 0,
    errors_count: 0,
    recent_logs: [
      {
        ts: nowIso,
        summary: 'Persistent background swarm is in STANDBY on serverless edge. Live orderbook evaluation runs on request.',
      },
    ],
  }));

  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
  return res.status(200).json({ count: agents.length, agents });
}
