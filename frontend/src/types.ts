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

export interface Order {
  order_id: string;
  ticker: string;
  side: string;
  action: string;
  status: string;
  contracts: string;
  price: string;
  price_cents?: string;
  created_time: string;
}

export interface TradeFill {
  fill_id: string;
  order_id?: string;
  trade_id?: string;
  ticker: string;
  side: string;
  action: string;
  contracts: string;
  price: string;
  price_cents?: string;
  fee: string;
  total_cost?: string;
  created_time: string;
}

export interface Position {
  ticker: string;
  side: string;
  contracts: string;
  avg_entry: string;
  avg_entry_cents?: string;
  current_mid?: string | null;
  unrealized_pnl: string;
  cost_basis: string;
  max_payout?: string;
  potential_profit?: string;
  fees_paid?: string;
  last_updated?: number | string;
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
  positions: Position[];
  resting_orders?: Order[];
  orders?: Order[];
  recent_fills?: TradeFill[];
}

export interface CalibrationReport {
  resolved_count: number;
  brier_score?: number;
  log_loss?: number;
  expected_calibration_error?: number;
  status: string;
}
