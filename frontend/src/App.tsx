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
  AlertTriangle 
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warn' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 6000);
  };

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
    } catch (err) {
      console.error('Error refreshing data', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

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
        showToast(`Order submitted: ${contracts}x ${ticker} ${side.toUpperCase()} at $${price.toFixed(4)} (${res.mode})`, 'success');
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
    <div className="min-h-screen bg-[#070b0e] text-slate-200 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Header */}
      <Header
        portfolio={portfolio}
        feeds={feeds}
        onTriggerKillSwitch={handleTriggerKillSwitch}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 font-mono text-xs ${
              toastMessage.type === 'warn'
                ? 'bg-rose-950/90 border-rose-700 text-rose-200'
                : toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            {toastMessage.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="border-b border-zinc-800 bg-[#0d1215] px-6 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('decision')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
              activeTab === 'decision'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>DECISION DESK</span>
          </button>

          <button
            onClick={() => setActiveTab('markets')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
              activeTab === 'markets'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>MARKET BROWSER</span>
          </button>

          <button
            onClick={() => setActiveTab('domains')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
              activeTab === 'domains'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>DOMAIN INTELLIGENCE</span>
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
              activeTab === 'agents'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AGENT COMMAND ({agents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
              activeTab === 'portfolio'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>PORTFOLIO & RISK</span>
          </button>

          <button
            onClick={() => setActiveTab('feeds')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
              activeTab === 'feeds'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>FEED TELEMETRY</span>
          </button>

          <button
            onClick={() => setActiveTab('calibration')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
              activeTab === 'calibration'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>CALIBRATION</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {activeTab === 'decision' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Compass className="h-4 w-4 text-emerald-400" />
                Live Decision Desk
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                Real-time focal point for institutional trade recommendations with conservative EV validation
              </p>
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
          <MarketBrowser markets={markets} />
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

      {/* Terminal Footer */}
      <footer className="border-t border-zinc-800 bg-[#0d1215] px-6 py-3 text-xs font-mono text-zinc-500 flex flex-wrap items-center justify-between gap-4">
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
          <span>Taker Fee Deduction: EXACT QUADRATIC</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
