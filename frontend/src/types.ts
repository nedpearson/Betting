export interface Opportunity {
  ticker: string;
  action: 'BUY_YES' | 'BUY_NO' | 'NO_TRADE';
  category: 'STRONG_CANDIDATE' | 'CANDIDATE' | 'WATCHLIST' | 'NO_TRADE';
  entry_price: string;
  max_entry_price: string;
  estimated_probability: string;
  conservative_probability: string;
  market_probability?: string | null;
  conservative_edge: string;
  net_roi: string;
  recommended_contracts: string;
  recommended_stake: string;
  max_loss: string;
  max_profit: string;
  model: string;
  evidence_summary: string;
}

export interface BestTradeResponse {
  available: boolean;
  status: string;
  opportunity?: Opportunity;
  reason?: string;
  created_at?: string;
  expires_at?: string;
  checked_at?: string;
}

export interface Market {
  ticker: string;
  title: string;
  yes_sub_title?: string | null;
  category?: string | null;
  status: string;
  close_time?: string | null;
  yes_bid?: string | null;
  yes_ask?: string | null;
  spread?: string | null;
  is_stale: boolean;
}

export interface AgentSnapshot {
  name: string;
  role: string;
  status: string;
  last_active_utc: string;
  decisions_count: number;
  errors_count: number;
  last_error?: string | null;
  recent_logs: Array<{
    ts: string;
    summary?: string;
    error?: string;
    details?: Record<string, unknown>;
  }>;
}

export interface FeedHealth {
  name: string;
  description: string;
  state: 'CONNECTED' | 'DEGRADED' | 'STALE' | 'DISCONNECTED' | 'NOT_CONFIGURED';
  transport: string;
  age_sec: number | null;
  stale_after_sec: number;
  last_update_utc: string | null;
  latency_ms_p50: number | null;
  reliability: number;
  messages_total: number;
  errors_total: number;
  last_error: string | null;
  licensing_note: string;
  settlement_grade: boolean;
}

export interface PortfolioSummary {
  starting_bankroll: string;
  available_cash: string;
  total_equity: string;
  total_open_risk: string;
  unrealized_pnl: string;
  realized_pnl: string;
  total_fees: string;
  drawdown_pct: string;
  open_positions_count: number;
  positions: Array<{
    ticker: string;
    side: string;
    contracts: string;
    avg_entry: string;
    current_mid?: string | null;
    unrealized_pnl: string;
    cost_basis: string;
  }>;
}

export interface CalibrationReport {
  resolved_count: number;
  brier_score?: number;
  log_loss?: number;
  expected_calibration_error?: number;
  status: string;
}
