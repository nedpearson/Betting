import React from 'react';
import { 
  Activity, 
  ShieldAlert, 
  Zap, 
  Layers, 
  RefreshCw, 
  Key, 
  CheckCircle2, 
  Wallet,
  Menu
} from 'lucide-react';
import type { PortfolioSummary, FeedHealth } from '../types';

interface HeaderProps {
  portfolio: PortfolioSummary | null;
  feeds: FeedHealth[];
  onTriggerKillSwitch: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenAccount: () => void;
  isKalshiConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  portfolio,
  feeds,
  onTriggerKillSwitch,
  onRefresh,
  isRefreshing,
  onOpenAccount,
  isKalshiConnected = false,
}) => {
  const healthyFeeds = feeds.filter((f) => f.state === 'CONNECTED' || f.state === 'DEGRADED').length;
  const totalFeeds = feeds.length || 6;
  const availableCash = portfolio ? parseFloat(portfolio.available_cash).toFixed(2) : '500.00';

  return (
    <header className="border-b border-zinc-800/80 bg-[#090d10]/95 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Connection Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              LIVE
            </span>
          </div>

          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5 font-mono">
              <span>BETTING INTELLIGENCE OS</span>
              <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/80">
                v0.1.0
              </span>
            </h1>
            <p className="hidden md:block text-[10px] font-mono text-zinc-400">
              Kalshi Institutional Gateway • Fractional Kelly Capital Allocation
            </p>
          </div>
        </div>

        {/* Bankroll & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-4 font-mono">
          {/* Bankroll Pill (Clickable on Mobile & Desktop to open Account) */}
          <button
            onClick={onOpenAccount}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 text-left transition active:scale-95 group"
            title="Manage Bankroll & Kalshi Account"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
            <div>
              <span className="text-[9px] text-zinc-400 uppercase block leading-none">Bankroll</span>
              <span className="text-xs sm:text-sm font-bold text-white leading-none">
                ${availableCash}
              </span>
            </div>
          </button>

          {/* Desktop Metric: Open Risk */}
          <div className="hidden lg:flex flex-col items-end text-right">
            <span className="text-[9px] text-zinc-500 uppercase">Open Risk</span>
            <span className="text-xs font-semibold text-amber-400">
              ${portfolio ? parseFloat(portfolio.total_open_risk).toFixed(2) : '0.00'}
            </span>
          </div>

          {/* Desktop Feeds Count */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-300">
            <Layers className="h-3 w-3 text-zinc-400" />
            <span>{healthyFeeds}/{totalFeeds} Feeds</span>
          </div>

          {/* Link Kalshi Account Button */}
          <button
            onClick={onOpenAccount}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 ${
              isKalshiConnected
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
            title="Kalshi API Account Settings"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isKalshiConnected ? 'Kalshi Linked' : 'Link Account'}
            </span>
            {isKalshiConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition disabled:opacity-50 active:scale-95"
            title="Scan / Refresh Live Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Emergency Kill Switch */}
          <button
            onClick={onTriggerKillSwitch}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 font-bold transition active:scale-95"
            title="Emergency Hardware Kill Switch"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-[11px]">HALT</span>
          </button>
        </div>
      </div>
    </header>
  );
};
