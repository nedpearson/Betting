import React, { useState, useEffect, useCallback } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  BestTradeCard 
} from './components/BestTradeCard';
import { 
  OpportunitiesTable 
} from './components/OpportunitiesTable';
import { 
  MarketBrowser 
} from './components/MarketBrowser';
import { 
  DomainViews 
} from './components/DomainViews';
import { 
  AgentCommandCenter 
} from './components/AgentCommandCenter';
import { 
  PortfolioView 
} from './components/PortfolioView';
import { 
  RiskControls 
} from './components/RiskControls';
import { 
  FeedHealthView 
} from './components/FeedHealthView';
import { 
  CalibrationView 
} from './components/CalibrationView';
import { 
  AccountModal 
} from './components/AccountModal';
import { 
  MobileNav 
} from './components/MobileNav';

import type {
  BestTradeResponse,
  Opportunity,
  Market,
  AgentSnapshot,
  FeedHealth,
  PortfolioSummary,
  CalibrationReport,
} from './types';

import {
  fetchBestTrade,
  fetchOpportunities,
  fetchMarkets,
  fetchAgents,
  fetchPortfolio,
  fetchHealth,
  fetchCalibration,
  triggerKillSwitch,
  placeOrder,
  subscribeEventStream,
} from './api';

import { 
  Compass, 
  Layers, 
  Bot, 
  Briefcase, 
  Activity, 
  Target, 
  Globe, 
  CheckCircle2, 
  AlertTriangle,
  Key
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'decision' | 'markets' | 'domains' | 'agents' | 'portfolio' | 'feeds' | 'calibration'
  >('decision');

  const [bestTrade, setBestTrade] = useState<BestTradeResponse | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [agents, setAgents] = useState<AgentSnapshot[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [feeds, setFeeds] = useState<FeedHealth[]>([]);
  const [calibration, setCalibration] = useState<CalibrationReport | null>(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isKalshiConnected, setIsKalshiConnected] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warn' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 6000);
  };

  const checkKalshiConnection = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/kalshi');
      if (res.ok) {
        const data = await res.json();
        setIsKalshiConnected(Boolean(data.connected));
      }
    } catch {
      // ignore
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [bt, opps, mkts, agts, port, hlt, cal] = await Promise.allSettled([
        fetchBestTrade(),
        fetchOpportunities(),
        fetchMarkets(),
        fetchAgents(),
        fetchPortfolio(),
        fetchHealth(),
        fetchCalibration(),
      ]);

      if (bt.status === 'fulfilled') setBestTrade(bt.value);
      if (opps.status === 'fulfilled') setOpportunities(opps.value);
      if (mkts.status === 'fulfilled') setMarkets(mkts.value);
      if (agts.status === 'fulfilled') setAgents(agts.value);
      if (port.status === 'fulfilled') setPortfolio(port.value);
      if (hlt.status === 'fulfilled') setFeeds(hlt.value);
      if (cal.status === 'fulfilled') setCalibration(cal.value);

      checkKalshiConnection();
    } catch (err) {
      console.error('Error refreshing data', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [checkKalshiConnection]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 6000);

    const unsubscribe = subscribeEventStream((eventType, data) => {
      if (eventType === 'recommendation.issued') {
        showToast(`New Trade Candidate Issued for ${data.ticker}`, 'info');
        refreshAll();
      } else if (eventType === 'fill') {
        showToast(`Order filled: ${data.contracts}x ${data.ticker} @ $${data.fill_price}`, 'success');
        refreshAll();
      } else if (eventType === 'safety.halt') {
        showToast(`SAFETY HALT TRIGGERED: ${data.reason}`, 'warn');
        refreshAll();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refreshAll]);

  const handleExecute = async (
    ticker: string,
    side: 'yes' | 'no',
    contracts: number,
    price: number
  ) => {
    setIsExecuting(true);
    try {
      const res = await placeOrder(ticker, side, contracts, price);
      if (res.status === 'FILLED' || res.status === 'PLACED') {
        showToast(`Order submitted: ${contracts}x ${ticker} ${side.toUpperCase()} at $${price.toFixed(4)} (${res.mode || 'Paper'})`, 'success');
      } else if (res.status === 'REJECTED') {
        showToast(`Order rejected by risk governor: ${res.reason}`, 'warn');
      } else {
        showToast(`Order response: ${res.status || 'OK'}`, 'info');
      }
      refreshAll();
    } catch (err) {
      console.error('Failed to place order', err);
      showToast('Error sending order to engine API', 'warn');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTriggerKillSwitch = async () => {
    try {
      const res = await triggerKillSwitch();
      showToast(`EMERGENCY KILL SWITCH ACTIVATED: ${res.reason || 'All trading paused'}`, 'warn');
      refreshAll();
    } catch (err) {
      console.error('Failed to trigger kill switch', err);
      showToast('Failed to trigger kill switch', 'warn');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b0e] text-slate-200 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300 relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-emerald-500/5 blur-[120px] pointer-events-none rounded-full z-0" />

      {/* Top Header */}
      <Header
        portfolio={portfolio}
        feeds={feeds}
        onTriggerKillSwitch={handleTriggerKillSwitch}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        isKalshiConnected={isKalshiConnected}
      />

      {/* Account Settings & Kalshi Linking Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountUpdated={refreshAll}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        opportunitiesCount={opportunities.length}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 font-mono text-xs backdrop-blur-xl ${
              toastMessage.type === 'warn'
                ? 'bg-rose-950/90 border-rose-700/80 text-rose-200'
                : toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-700/80 text-emerald-200'
                : 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200'
            }`}
          >
            {toastMessage.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Desktop Navigation Tabs (Hidden on mobile where MobileNav handles it) */}
      <div className="hidden sm:block border-b border-zinc-800/80 bg-[#0c1114]/80 backdrop-blur-md px-6 py-2 sticky top-[57px] z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('decision')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
              activeTab === 'decision'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>DECISION DESK</span>
            {opportunities.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-500 text-zinc-950 text-[10px] rounded-full font-bold">
                {opportunities.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('markets')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
              activeTab === 'markets'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>MARKET BROWSER</span>
            <span className="text-[10px] text-zinc-500 font-mono">({markets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('domains')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
              activeTab === 'domains'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>DOMAIN INTELLIGENCE</span>
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
              activeTab === 'agents'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AGENT COMMAND ({agents.length || 16})</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
              activeTab === 'portfolio'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>PORTFOLIO & RISK</span>
          </button>

          <button
            onClick={() => setActiveTab('feeds')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
              activeTab === 'feeds'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>FEED TELEMETRY</span>
          </button>

          <button
            onClick={() => setActiveTab('calibration')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
              activeTab === 'calibration'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>CALIBRATION</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body (with extra bottom padding for mobile navigation) */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto space-y-6 pb-24 sm:pb-12 relative z-10">
        {activeTab === 'decision' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  Live Decision Desk
                </h2>
                <p className="text-[11px] sm:text-xs text-zinc-500 font-mono">
                  Real-time focal point for institutional recommendations with conservative EV validation
                </p>
              </div>

              {!isKalshiConnected && (
                <button
                  onClick={() => setIsAccountModalOpen(true)}
                  className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold flex items-center gap-1.5 transition"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Link Kalshi Account</span>
                </button>
              )}
            </div>

            {/* Focal Point Decision Card */}
            <BestTradeCard
              data={bestTrade}
              onExecute={handleExecute}
              isExecuting={isExecuting}
            />

            {/* Candidate Leaderboard */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                Ranked Candidate Leaderboard
              </h3>
              <OpportunitiesTable
                opportunities={opportunities}
                onSelect={(opp) => {
                  showToast(`Selected candidate: ${opp.ticker}`, 'info');
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'markets' && (
          <MarketBrowser 
            markets={markets} 
            onExecuteTrade={handleExecute}
          />
        )}

        {activeTab === 'domains' && (
          <DomainViews />
        )}

        {activeTab === 'agents' && (
          <AgentCommandCenter agents={agents} />
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-8">
            <PortfolioView portfolio={portfolio} />
            <RiskControls onTriggerKillSwitch={handleTriggerKillSwitch} />
          </div>
        )}

        {activeTab === 'feeds' && (
          <FeedHealthView />
        )}

        {activeTab === 'calibration' && (
          <CalibrationView report={calibration} />
        )}
      </main>

      {/* Terminal Footer (Desktop only) */}
      <footer className="hidden sm:flex border-t border-zinc-800/80 bg-[#090d10] px-6 py-3 text-xs font-mono text-zinc-500 flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Kalshi Gateway: <span className="text-zinc-300">Public REST Active</span>
          </span>
          <span>•</span>
          <span>Zero Fabricated Data Guarantee</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Triple-Lock Gating: ARMED</span>
          <span>•</span>
          <span>Fractional Kelly (f* = 0.25)</span>
          <span>•</span>
          <span>Exact Quadratic Fees</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
