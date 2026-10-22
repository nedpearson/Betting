import React, { useState, useEffect, useCallback } from 'react';
import { 
  Header
} from './components/Header';
import type { FreshnessState } from './components/Header';
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
import type { MainTabType } from './components/MobileNav';
import { 
  TradeDrawer 
} from './components/TradeDrawer';
import { 
  WatchlistView 
} from './components/WatchlistView';
import { 
  InstallPwaModal 
} from './components/InstallPwaModal';
import { 
  MobileMoreModal 
} from './components/MobileMoreModal';
import { 
  useWatchlist 
} from './hooks/useWatchlist';

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
  Key,
  Star,
  Download,
  WifiOff
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTabType>('decision');

  const [bestTrade, setBestTrade] = useState<BestTradeResponse | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [agents, setAgents] = useState<AgentSnapshot[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [feeds, setFeeds] = useState<FeedHealth[]>([]);
  const [calibration, setCalibration] = useState<CalibrationReport | null>(null);
  const [isHalted, setIsHalted] = useState<boolean>(false);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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
  const [selectedMarketCategory, setSelectedMarketCategory] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);
  const [orderReceipt, setOrderReceipt] = useState<{
    ticker: string;
    side: 'yes' | 'no';
    contracts: number;
    price: number;
    status: string;
    orderId?: string;
    fees?: string;
    totalCost?: string;
    message?: string;
  } | null>(null);

  // Watchlist integration
  const { watchlist, isWatchlisted, toggleWatchlist } = useWatchlist();

  // Truthful data freshness and connectivity monitoring
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastDataReceivedAt, setLastDataReceivedAt] = useState<number>(Date.now());
  const [lastDataAgeSec, setLastDataAgeSec] = useState<number>(0);

  const showToast = (text: string, type: 'success' | 'warn' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 6000);
  };

  // Capture PWA install prompt event
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Online / offline network event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Network connection restored. Revalidating live markets...', 'success');
      refreshAll();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Device is offline. Real-money order execution is disabled.', 'warn');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Compute second-by-second data age
  useEffect(() => {
    const timer = setInterval(() => {
      setLastDataAgeSec(Math.max(0, Math.floor((Date.now() - lastDataReceivedAt) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastDataReceivedAt]);

  const dataFreshness: FreshnessState = !isOnline
    ? 'OFFLINE'
    : lastDataAgeSec < 15
    ? 'LIVE'
    : lastDataAgeSec < 60
    ? 'DELAYED'
    : 'STALE';

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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return; // Do not attempt fetch while device is disconnected
    }

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

      setLastDataReceivedAt(Date.now());
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

  // Mobile Efficiency: Visibility-Aware Polling (stops completely in background)
  useEffect(() => {
    refreshAll();

    let pollInterval: any = null;

    const startPolling = () => {
      if (!pollInterval) {
        // Poll every 8 seconds in active foreground (supplemented by SSE pushes)
        pollInterval = setInterval(refreshAll, 8000);
      }
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Battery Saver: stop polling completely when phone is locked or tab is hidden
        stopPolling();
      } else {
        // Instant foreground wake: refresh immediately and resume polling
        refreshAll();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    // EventSource real-time stream subscription for instantaneous updates
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
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    if (!isOnline) {
      showToast('Cannot execute trade: Device is offline. Reconnect to trade.', 'warn');
      return;
    }

    setIsExecuting(true);
    try {
      const res = await placeOrder(ticker, side, contracts, price);
      if (['FILLED', 'PLACED', 'executed', 'resting', 'partially_filled'].includes(res.status)) {
        showToast(`Order confirmed: ${contracts}x ${ticker} ${side.toUpperCase()} @ $${price.toFixed(4)} (Status: ${res.status.toUpperCase()})`, 'success');
        setOrderReceipt({
          ticker,
          side,
          contracts,
          price,
          status: res.status ? res.status.toUpperCase() : 'EXECUTED',
          orderId: res.order_id,
          fees: res.fees,
          totalCost: ((contracts * price) + parseFloat(res.fees || '0')).toFixed(2),
          message: res.message,
        });
      } else if (res.status === 'REJECTED' || res.status === 'rejected' || res.status === 'BACKEND_ERROR' || !res.success) {
        const diagMsg = res.balance_diagnostics?.remediation ? ` - ${res.balance_diagnostics.remediation}` : '';
        showToast(`${res.reason || res.detail || 'Execution rejected'}${diagMsg}`, 'warn');
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

      {/* Offline Status Warning Sticky Bar */}
      {!isOnline && (
        <div className="bg-rose-950/95 border-b border-rose-800 text-rose-200 px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-mono font-bold sticky top-0 z-50 shadow-lg">
          <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
          <span>DEVICE IS OFFLINE: Market prices are paused and live order execution is disabled.</span>
        </div>
      )}

      {/* Top Header with Truthful Freshness Indicator */}
      <Header
        portfolio={portfolio}
        feeds={feeds}
        onTriggerKillSwitch={handleTriggerKillSwitch}
        onResumeTrading={handleResumeTrading}
        isHalted={isHalted}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        isKalshiConnected={isKalshiConnected}
        dataFreshness={dataFreshness}
        lastDataAgeSec={lastDataAgeSec}
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono shadow-md transition active:scale-95 cursor-pointer"
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

      {/* Install PWA Modal */}
      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
      />

      {/* Mobile More Navigation Drawer */}
      <MobileMoreModal
        isOpen={isMoreModalOpen}
        onClose={() => setIsMoreModalOpen(false)}
        onSelectTab={setActiveTab}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        onTriggerKillSwitch={isHalted ? handleResumeTrading : handleTriggerKillSwitch}
        isHalted={isHalted}
        isKalshiConnected={isKalshiConnected}
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
        isOffline={!isOnline}
      />

      {/* Order Execution Live Receipt Modal */}
      {orderReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0b1013] border-2 border-emerald-500/50 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                  KALSHI CLEARING: {orderReceipt.status}
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  Order Successfully Placed!
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <span className="text-zinc-400">Market</span>
                <span className="font-bold text-white text-right">{orderReceipt.ticker}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Outcome &amp; Size</span>
                <span className={`font-black ${orderReceipt.side === 'yes' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  BUY {orderReceipt.side.toUpperCase()} ({orderReceipt.contracts} contracts)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Limit Price</span>
                <span className="font-bold text-white">${orderReceipt.price.toFixed(4)} ({(orderReceipt.price * 100).toFixed(1)}¢)</span>
              </div>
              {orderReceipt.fees && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Taker Fees</span>
                  <span className="font-bold text-amber-400">${parseFloat(orderReceipt.fees).toFixed(4)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                <span className="text-white font-bold">Total Capital Committed</span>
                <span className="font-black text-emerald-400 text-sm">${orderReceipt.totalCost}</span>
              </div>
              {orderReceipt.orderId && (
                <div className="pt-1 text-[10px] text-zinc-500 truncate">
                  Exchange Order ID: {orderReceipt.orderId}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  setOrderReceipt(null);
                  setActiveTab('portfolio');
                }}
                className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black font-mono text-xs transition active:scale-95 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Briefcase className="w-4 h-4" />
                <span>View Portfolio</span>
              </button>
              <button
                onClick={() => setOrderReceipt(null)}
                className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold font-mono text-xs transition border border-zinc-800 cursor-pointer"
              >
                <span>Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (5 Primary Sections + More Drawer) */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenMore={() => setIsMoreModalOpen(true)}
        opportunitiesCount={opportunities.length}
        watchlistCount={watchlist.length}
        positionsCount={portfolio?.open_positions_count || 0}
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

      {/* Desktop Navigation Tabs */}
      <div className="hidden sm:block border-b border-zinc-800 bg-[#0c1114]/90 backdrop-blur-md px-6 py-3 sticky top-[65px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('decision')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition cursor-pointer ${
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
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition cursor-pointer ${
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
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition cursor-pointer ${
              activeTab === 'watchlist'
                ? 'bg-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            <Star className="w-5 h-5" />
            <span>Watchlist</span>
            {watchlist.length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full font-black ${
                activeTab === 'watchlist' ? 'bg-zinc-950 text-emerald-400' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {watchlist.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition cursor-pointer ${
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
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition cursor-pointer ${
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
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition cursor-pointer ${
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
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition cursor-pointer ${
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
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm sm:text-base font-bold transition cursor-pointer ${
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

      {/* Main Workspace Body */}
      <main className="flex-1 p-3.5 sm:p-8 max-w-7xl w-full mx-auto space-y-6 pb-28 sm:pb-16 relative z-10">
        {activeTab === 'decision' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <Compass className="h-6 w-6 text-emerald-400" />
                  Live Decision Desk &amp; Top Trade
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Continuously scans 1,000+ Kalshi markets for statistically defensible edges exceeding exchange fees and uncertainty bounds.
                </p>
              </div>

              {!isKalshiConnected && (
                <button
                  onClick={() => setIsAccountModalOpen(true)}
                  className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
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
              positions={portfolio?.positions || []}
              onExecute={handleOpenTradeDrawer}
              isExecuting={isExecuting}
              onToggleWatchlist={toggleWatchlist}
              isWatchlisted={bestTrade?.opportunity ? isWatchlisted(bestTrade.opportunity.ticker) : false}
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
            initialCategory={selectedMarketCategory}
            positions={portfolio?.positions || []}
            onExecuteTrade={handleOpenTradeDrawer}
            availableCash={portfolio?.available_cash}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistView
            watchlist={watchlist}
            markets={markets}
            opportunities={opportunities}
            onToggleWatchlist={toggleWatchlist}
            onTrade={handleOpenTradeDrawer}
            onSelectMarket={(m) => {
              handleOpenTradeDrawer(m.ticker, 'yes', 10, parseFloat(m.yes_ask || '0.50'));
            }}
          />
        )}

        {activeTab === 'domains' && (
          <DomainViews />
        )}

        {activeTab === 'agents' && (
          <AgentCommandCenter agents={agents} />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView 
            portfolio={portfolio} 
            onExecuteTrade={handleOpenTradeDrawer}
            onOpenAccount={() => setIsAccountModalOpen(true)}
            isKalshiConnected={isKalshiConnected}
          />
        )}

        {activeTab === 'feeds' && (
          <FeedHealthView 
            feeds={feeds} 
            onRefresh={refreshAll}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === 'calibration' && (
          <CalibrationView data={calibration} />
        )}
      </main>
    </div>
  );
};

export default App;
