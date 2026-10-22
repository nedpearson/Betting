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
import { 
  TradeDrawer 
} from './components/TradeDrawer';

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
  resumeTrading,
  fetchKillSwitchStatus,
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
  const [isHalted, setIsHalted] = useState<boolean>(false);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isKalshiConnected, setIsKalshiConnected] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTradeMarket, setActiveTradeMarket] = useState<Market | null>(null);
  const [tradeDefaults, setTradeDefaults] = useState<{
    side: 'yes' | 'no';
    contracts: number;
    price: number;
  }>({
    side: 'yes',
    contracts: 12,
    price: 0.39,
  });

  const [selectedOppIndex, setSelectedOppIndex] = useState<number>(0);
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
      const [bt, opps, mkts, agts, port, hlt, cal, ks] = await Promise.allSettled([
        fetchBestTrade(),
        fetchOpportunities(),
        fetchMarkets(),
        fetchAgents(),
        fetchPortfolio(),
        fetchHealth(),
        fetchCalibration(),
        fetchKillSwitchStatus(),
      ]);

      if (bt.status === 'fulfilled') setBestTrade(bt.value);
      if (opps.status === 'fulfilled') setOpportunities(opps.value);
      if (mkts.status === 'fulfilled') setMarkets(mkts.value);
      if (agts.status === 'fulfilled') setAgents(agts.value);
      if (port.status === 'fulfilled' && port.value) {
        const cashVal = parseFloat(port.value.available_cash || '0');
        if (cashVal > 0 || !portfolio) {
          setPortfolio(port.value);
        }
      }
      if (hlt.status === 'fulfilled') setFeeds(hlt.value);
      if (cal.status === 'fulfilled') setCalibration(cal.value);
      if (ks.status === 'fulfilled' && ks.value) {
        setIsHalted(Boolean(ks.value.is_halted || ks.value.status === 'HALTED'));
      }
    } catch (err) {
      console.error('Error refreshing data', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [portfolio]);

  useEffect(() => {
    checkKalshiConnection();
    const connInterval = setInterval(checkKalshiConnection, 30000);
    return () => clearInterval(connInterval);
  }, [checkKalshiConnection]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 2000);

    const unsubscribe = subscribeEventStream((eventType, data) => {
      if (eventType === 'recommendation.issued') {
        showToast(`New Trade Candidate Issued for ${data.ticker}`, 'info');
        refreshAll();
      } else if (eventType === 'fill') {
        showToast(`Order filled: ${data.contracts}x ${data.ticker} @ $${data.fill_price}`, 'success');
        refreshAll();
      } else if (eventType === 'safety.halt') {
        setIsHalted(true);
        showToast(`SAFETY HALT TRIGGERED: ${data.reason}`, 'warn');
        refreshAll();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refreshAll]);

  const handleOpenTradeDrawer = (
    ticker: string,
    side: 'yes' | 'no',
    contracts: number,
    price: number
  ) => {
    const found = markets.find((m) => m.ticker === ticker);
    const m: Market = found || {
      ticker,
      title: ticker,
      category: 'Sports',
      status: 'active',
      yes_bid: price.toFixed(4),
      yes_ask: price.toFixed(4),
      spread: '0.01',
      is_stale: false,
    };
    setTradeDefaults({ side, contracts, price });
    setActiveTradeMarket(m);
  };

  const handleConfirmOrder = async (
    ticker: string,
    side: 'yes' | 'no',
    contracts: number,
    price: number
  ) => {
    setIsExecuting(true);
    try {
      const res = await placeOrder(ticker, side, contracts, price);
      if (['FILLED', 'PLACED', 'executed', 'resting', 'partially_filled'].includes(res.status)) {
        showToast(`Order confirmed: ${contracts}x ${ticker} ${side.toUpperCase()} @ $${price.toFixed(4)} (Status: ${res.status.toUpperCase()})`, 'success');
      } else if (res.status === 'REJECTED' || res.status === 'rejected') {
        showToast(`Order rejected: ${res.reason || res.detail || 'Risk limit or gate blocked execution'}`, 'warn');
      } else {
        showToast(`Order response: ${res.status || 'Received'}`, 'info');
      }
      refreshAll();
    } catch (err) {
      console.error('Failed to place order', err);
      showToast('Error sending order to engine API', 'warn');
    } finally {
      setIsExecuting(false);
      setActiveTradeMarket(null);
    }
  };

  const handleResumeTrading = async () => {
    try {
      const res = await resumeTrading();
      setIsHalted(false);
      showToast(`TRADING RESUMED: ${res.reason || 'Safety halt cleared'}`, 'success');
      refreshAll();
    } catch (err) {
      console.error('Failed to resume trading', err);
      showToast('Failed to resume trading', 'warn');
    }
  };

  const handleTriggerKillSwitch = async () => {
    try {
      const res = await triggerKillSwitch();
      setIsHalted(true);
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
        onResumeTrading={handleResumeTrading}
        isHalted={isHalted}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        isKalshiConnected={isKalshiConnected}
      />

      {/* Safety Halt Active Sticky Banner */}
      {isHalted && (
        <div className="bg-rose-950/90 border-b border-rose-850 text-rose-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-30 relative backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-mono font-medium">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 animate-pulse" />
            <span>
              <strong>EMERGENCY SAFETY HALT ENGAGED:</strong> Order execution is paused.
            </span>
          </div>
          <button
            onClick={handleResumeTrading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono shadow-md transition active:scale-95"
          >
            <span>RESUME TRADING NOW</span>
          </button>
        </div>
      )}

      {/* Account Settings & Kalshi Linking Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountUpdated={refreshAll}
      />

      {/* Global Interactive Trade Execution Drawer */}
      <TradeDrawer
        market={activeTradeMarket}
        isOpen={Boolean(activeTradeMarket)}
        onClose={() => setActiveTradeMarket(null)}
        onExecute={handleConfirmOrder}
        isExecuting={isExecuting}
        initialSide={tradeDefaults.side}
        initialContracts={tradeDefaults.contracts}
        initialPrice={tradeDefaults.price}
        availableCash={portfolio?.available_cash}
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
      <div className="hidden sm:block border-b border-zinc-800 bg-[#0c1114]/90 backdrop-blur-md px-6 py-3 sticky top-[73px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('decision')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition ${
              activeTab === 'decision'
                ? 'bg-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span>Top Trade</span>
            {opportunities.length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full font-black ${
                activeTab === 'decision' ? 'bg-zinc-950 text-emerald-400' : 'bg-emerald-500 text-zinc-950'
              }`}>
                {opportunities.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('markets')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition ${
              activeTab === 'markets'
                ? 'bg-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>All Markets</span>
            <span className={`text-xs font-mono font-semibold ${
              activeTab === 'markets' ? 'text-zinc-900' : 'text-zinc-400'
            }`}>({markets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition ${
              activeTab === 'portfolio'
                ? 'bg-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span>My Portfolio</span>
          </button>

          <button
            onClick={() => setActiveTab('feeds')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition ${
              activeTab === 'feeds'
                ? 'bg-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span>Data Feeds</span>
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition ${
              activeTab === 'agents'
                ? 'bg-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span>AI Agents</span>
          </button>

          <button
            onClick={() => setActiveTab('domains')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition ${
              activeTab === 'domains'
                ? 'bg-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <Globe className="w-5 h-5" />
            <span>Intel</span>
          </button>

          <button
            onClick={() => setActiveTab('calibration')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition ${
              activeTab === 'calibration'
                ? 'bg-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <Target className="w-5 h-5" />
            <span>Model Accuracy</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body (with extra bottom padding for mobile navigation) */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8 pb-28 sm:pb-16 relative z-10">
        {activeTab === 'decision' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <Compass className="h-6 w-6 text-emerald-400" />
                  Live Decision Desk &amp; Top Trade
                </h2>
                <p className="text-sm sm:text-base text-zinc-400 mt-1">
                  Continuously scans 1,000+ Kalshi markets for statistically defensible edges exceeding exchange fees and uncertainty bounds.
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

            {/* Focal Point Decision Card with Multi-Trade Carousel & AI Thesis */}
            <BestTradeCard
              data={bestTrade}
              opportunities={opportunities}
              selectedIndex={selectedOppIndex}
              onSelectIndex={setSelectedOppIndex}
              markets={markets}
              onExecute={handleOpenTradeDrawer}
              isExecuting={isExecuting}
            />

            {/* Candidate Leaderboard */}
            <div className="space-y-2">
              <OpportunitiesTable
                opportunities={opportunities}
                selectedTicker={opportunities[selectedOppIndex]?.ticker}
                onViewThesis={(item: any) => {
                  const idx = opportunities.findIndex((o) => o.ticker === item.ticker);
                  if (idx >= 0) {
                    setSelectedOppIndex(idx);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                onSelect={(opp: any) => {
                  const item = opp.payload || opp;
                  const idx = opportunities.findIndex((o) => o.ticker === item.ticker);
                  if (idx >= 0) setSelectedOppIndex(idx);
                  const isNo = (item.action === 'BUY_NO');
                  const side: 'yes' | 'no' = isNo ? 'no' : 'yes';
                  const contracts = parseInt(item.recommended_contracts) || 10;
                  const price = parseFloat(item.entry_price || item.max_entry_price || '0.50');
                  handleOpenTradeDrawer(item.ticker, side, contracts, price);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'markets' && (
          <MarketBrowser 
            markets={markets} 
            onExecuteTrade={handleOpenTradeDrawer}
            availableCash={portfolio?.available_cash}
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
            <RiskControls 
              onTriggerKillSwitch={handleTriggerKillSwitch} 
              isHalted={isHalted}
              onResumeTrading={handleResumeTrading}
            />
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
