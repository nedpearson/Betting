import React from 'react';
import { Activity, ShieldAlert, Zap, Layers, RefreshCw } from 'lucide-react';
import type { PortfolioSummary, FeedHealth } from '../types';

interface HeaderProps {
  portfolio: PortfolioSummary | null;
  feeds: FeedHealth[];
  onTriggerKillSwitch: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  portfolio,
  feeds,
  onTriggerKillSwitch,
  onRefresh,
  isRefreshing,
}) => {
  const healthyFeeds = feeds.filter((f) => f.state === 'CONNECTED' || f.state === 'DEGRADED').length;
  const totalFeeds = feeds.length;

  return (
    <header className="border-b border-zinc-800 bg-[#0d1215] px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 shadow-md">
      {/* Brand & System Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs font-semibold text-emerald-400 uppercase tracking-widest">
            LIVE ENGINE
          </span>
        </div>
        <div className="h-4 w-px bg-zinc-700" />
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            <span>BETTING INTELLIGENCE OS</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              v0.1.0
            </span>
          </h1>
          <p className="text-[11px] font-mono text-zinc-400">
            Kalshi Production Gateway • Institutional Quantitative Decision Support
          </p>
        </div>
      </div>

      {/* Telemetry Summary & Bankroll */}
      <div className="flex items-center gap-6 text-xs font-mono">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] text-zinc-500 uppercase">Available Bankroll</span>
          <span className="text-sm font-bold text-white">
            ${portfolio ? parseFloat(portfolio.available_cash).toFixed(2) : '500.00'}
          </span>
        </div>

        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] text-zinc-500 uppercase">Open Risk</span>
          <span className="font-semibold text-amber-400">
            ${portfolio ? parseFloat(portfolio.total_open_risk).toFixed(2) : '0.00'}
          </span>
        </div>

        <div className="hidden lg:flex flex-col items-end">
          <span className="text-[10px] text-zinc-500 uppercase">Realized P&L</span>
          <span
            className={`font-semibold ${
              portfolio && parseFloat(portfolio.realized_pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            ${portfolio ? parseFloat(portfolio.realized_pnl).toFixed(2) : '0.00'}
          </span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800">
          <Layers className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-300">
            {healthyFeeds}/{totalFeeds} Feeds
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition disabled:opacity-50"
            title="Scan / Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onTriggerKillSwitch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 font-semibold transition"
            title="Emergency Kill Switch"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-[11px]">HALT</span>
          </button>
        </div>
      </div>
    </header>
  );
};
