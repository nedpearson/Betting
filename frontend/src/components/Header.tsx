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
  Type
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

  return (
    <header className="border-b border-zinc-800 bg-[#090d10]/95 backdrop-blur-xl px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        
        {/* Brand & Connection Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-black text-emerald-400 uppercase tracking-wider">
              LIVE
            </span>
          </div>

          <div>
            <h1 className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>BETTING INTELLIGENCE OS</span>
              <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono font-medium">
                v1.0
              </span>
            </h1>
            <p className="hidden md:block text-xs text-zinc-400 font-medium">
              Wall Street–Grade Quantitative Intelligence &amp; Execution for Kalshi
            </p>
          </div>
        </div>

        {/* Bankroll & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Bankroll Card (Big & Clear) */}
          <button
            onClick={onOpenAccount}
            className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 text-left transition active:scale-95 group shadow-md"
            title="Click to view full bankroll & Kalshi portfolio"
          >
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 uppercase font-semibold block leading-tight">
                Cash Balance
              </span>
              <span className="text-base sm:text-xl font-black text-emerald-400 font-mono leading-tight">
                ${availableCash}
              </span>
            </div>
          </button>

          {/* Display Text Size Switcher */}
          <div className="hidden lg:flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
            <span className="text-xs text-zinc-400 px-2 font-medium flex items-center gap-1">
              <Type className="w-3.5 h-3.5" /> Size:
            </span>
            <button
              onClick={() => changeScale('normal')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                uiScale === 'normal'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Standard Text Size"
            >
              Default
            </button>
            <button
              onClick={() => changeScale('large')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                uiScale === 'large'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Large Text Size (Recommended for laptops)"
            >
              Large
            </button>
            <button
              onClick={() => changeScale('xlarge')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                uiScale === 'xlarge'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Extra Large Text"
            >
              XL
            </button>
          </div>

          {/* Link Kalshi Account Button (Big & Prominent) */}
          <button
            onClick={onOpenAccount}
            className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl border text-xs sm:text-sm font-bold transition active:scale-95 shadow-md ${
              isKalshiConnected
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-zinc-950 font-black shadow-emerald-900/30'
            }`}
            title="Kalshi API Account Settings"
          >
            <Key className="w-4 h-4" />
            <span>
              {isKalshiConnected ? 'Kalshi Linked' : 'Link Kalshi'}
            </span>
            {isKalshiConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition disabled:opacity-50 active:scale-95"
            title="Scan / Refresh Live Data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Emergency Kill Switch */}
          <button
            onClick={onTriggerKillSwitch}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold transition active:scale-95 text-xs sm:text-sm"
            title="Emergency Hardware Kill Switch"
          >
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <span>HALT</span>
          </button>
        </div>
      </div>
    </header>
  );
};
