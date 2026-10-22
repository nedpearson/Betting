import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldAlert, 
  Zap, 
  Layers, 
  RefreshCw, 
  Key, 
  CheckCircle2, 
  Wallet,
  Menu,
  ZoomIn,
  Sliders,
  Type,
  Play,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react';
import type { PortfolioSummary, FeedHealth } from '../types';

export type FreshnessState = 'LIVE' | 'DELAYED' | 'STALE' | 'OFFLINE' | 'UNVERIFIED';

interface HeaderProps {
  portfolio: PortfolioSummary | null;
  feeds: FeedHealth[];
  onTriggerKillSwitch: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenAccount: () => void;
  onOpenInstall?: () => void;
  isKalshiConnected?: boolean;
  isHalted?: boolean;
  onResumeTrading?: () => void;
  dataFreshness?: FreshnessState;
  lastDataAgeSec?: number;
}

export const Header: React.FC<HeaderProps> = ({
  portfolio,
  feeds,
  onTriggerKillSwitch,
  onRefresh,
  isRefreshing,
  onOpenAccount,
  onOpenInstall,
  isKalshiConnected = false,
  isHalted = false,
  onResumeTrading,
  dataFreshness = 'LIVE',
  lastDataAgeSec = 2,
}) => {
  const healthyFeeds = feeds.filter((f) => f.state === 'CONNECTED' || f.state === 'DEGRADED').length;
  const availableCash = portfolio ? parseFloat(portfolio.available_cash).toFixed(2) : '--.--';

  const [uiScale, setUiScale] = useState<'normal' | 'large' | 'xlarge' | 'jumbo'>('large');

  useEffect(() => {
    const saved = localStorage.getItem('boi_ui_scale') as any;
    const initial = saved || 'large';
    setUiScale(initial);
    document.documentElement.setAttribute('data-ui-scale', initial);
  }, []);

  const changeScale = (scale: 'normal' | 'large' | 'xlarge' | 'jumbo') => {
    setUiScale(scale);
    localStorage.setItem('boi_ui_scale', scale);
    document.documentElement.setAttribute('data-ui-scale', scale);
  };

  // Truthful status badge styling & indicator
  const getFreshnessBadge = () => {
    switch (dataFreshness) {
      case 'LIVE':
        return {
          label: 'LIVE',
          sub: `${lastDataAgeSec}s ago`,
          dotClass: 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]',
          badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        };
      case 'DELAYED':
        return {
          label: 'DELAYED',
          sub: `${lastDataAgeSec}s ago`,
          dotClass: 'bg-amber-400',
          badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        };
      case 'STALE':
        return {
          label: 'STALE',
          sub: `${lastDataAgeSec}s ago`,
          dotClass: 'bg-orange-500',
          badgeClass: 'bg-orange-500/15 border-orange-500/40 text-orange-400',
        };
      case 'OFFLINE':
        return {
          label: 'OFFLINE',
          sub: 'No Network',
          dotClass: 'bg-rose-500',
          badgeClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
        };
      default:
        return {
          label: 'SYNCING',
          sub: 'checking',
          dotClass: 'bg-zinc-500',
          badgeClass: 'bg-zinc-800 border-zinc-700 text-zinc-400',
        };
    }
  };

  const badge = getFreshnessBadge();

  return (
    <header className="border-b border-zinc-800 bg-[#090d10]/95 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-6">
        
        {/* Brand & Truthful Connection Status */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border transition ${badge.badgeClass}`}
            title={`Authoritative data freshness: ${dataFreshness} (last verified ${lastDataAgeSec}s ago)`}
          >
            <div className={`h-2.5 w-2.5 rounded-full ${badge.dotClass}`} />
            <span className="font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span>{badge.label}</span>
              <span className="text-zinc-600 text-[9px]">•</span>
              <span className="text-zinc-300 font-mono text-[10px] sm:text-[11px] font-bold">{badge.sub}</span>
            </span>
          </div>

          <div>
            <h1 className="text-sm sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span className="truncate">BETTING INTELLIGENCE OS</span>
              <span className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                PWA
              </span>
            </h1>
            <p className="hidden xl:block text-[11px] text-zinc-400 font-medium">
              Wall Street–Grade Quantitative Intelligence &amp; Execution for Kalshi
            </p>
          </div>
        </div>

        {/* Bankroll & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Install App Button (if handler provided) */}
          {onOpenInstall && (
            <button
              onClick={onOpenInstall}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold transition active:scale-95 cursor-pointer shadow-sm"
              title="Install Betting Intelligence OS to Home Screen"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {/* Cash Balance Card */}
          <button
            onClick={onOpenAccount}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 text-left transition active:scale-95 group shadow-sm cursor-pointer"
            title="Click to view bankroll & Kalshi portfolio"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block leading-tight">
                Cash
              </span>
              <span className="text-xs sm:text-base font-black text-emerald-400 font-mono leading-tight">
                ${availableCash}
              </span>
            </div>
          </button>

          {/* Refresh Action Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Refresh all market data and portfolios"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Emergency Kill Switch or Resume */}
          {isHalted ? (
            <button
              onClick={onResumeTrading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs font-mono shadow-md transition active:scale-95 cursor-pointer"
              title="Click to resume trading operations"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Resume</span>
            </button>
          ) : (
            <button
              onClick={onTriggerKillSwitch}
              className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition active:scale-95 cursor-pointer"
              title="Emergency Kill Switch: Immediately halt all automated trading"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
