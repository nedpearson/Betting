import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowUpRight, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Bot, 
  CheckCircle2, 
  Layers,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Star,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { BestTradeResponse, Opportunity, Market, Position } from '../types';

interface BestTradeCardProps {
  data: BestTradeResponse | null;
  opportunities?: Opportunity[];
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  marketTitle?: string;
  markets?: Market[];
  positions?: Position[];
  onExecute: (ticker: string, side: 'yes' | 'no', contracts: number, price: number) => void;
  isExecuting?: boolean;
  onToggleWatchlist?: (ticker: string) => void;
  isWatchlisted?: boolean;
  onViewDetails?: (ticker: string) => void;
}

export const BestTradeCard: React.FC<BestTradeCardProps> = ({
  data,
  opportunities = [],
  selectedIndex = 0,
  onSelectIndex,
  marketTitle,
  markets = [],
  positions = [],
  onExecute,
  isExecuting,
  onToggleWatchlist,
  isWatchlisted = false,
  onViewDetails,
}) => {
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  // If opportunities are available, allow browsing through all of them
  const currentOpp: Opportunity | undefined = 
    opportunities.length > 0 && selectedIndex < opportunities.length
      ? opportunities[selectedIndex]
      : data?.opportunity;

  const totalOpps = opportunities.length > 0 ? opportunities.length : (data?.opportunity ? 1 : 0);

  if (!data && opportunities.length === 0) {
    return (
      <div className="bg-[#0e1417] border border-zinc-800 rounded-3xl p-6 sm:p-8 animate-pulse">
        <div className="h-7 w-64 bg-zinc-800 rounded-xl mb-4" />
        <div className="h-20 bg-zinc-800/50 rounded-2xl mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="h-14 bg-zinc-800/40 rounded-2xl" />
          <div className="h-14 bg-zinc-800/40 rounded-2xl" />
          <div className="h-14 bg-zinc-800/40 rounded-2xl" />
          <div className="h-14 bg-zinc-800/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!currentOpp) {
    return (
      <div className="bg-[#0e1417] border-2 border-zinc-800 hover:border-zinc-700 rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 shrink-0">
            <Sparkles className="h-7 w-7 text-emerald-400" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                CHIEF INVESTMENT OFFICER
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {data?.checked_at ? new Date(data.checked_at).toLocaleTimeString() : ''}
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              PATIENT DISCIPLINE: STANDING BY FOR DEFENSIVE EDGE
            </h2>
            
            <p className="text-sm sm:text-base text-zinc-300 max-w-3xl leading-relaxed">
              {data?.reason ||
                'Our 16 quantitative agents are continuously evaluating 1,000+ live contracts across weather, sports, and crypto. We only alert you when a trade has a mathematically proven advantage exceeding Kalshi trading fees, slippage, and uncertainty bounds.'}
            </p>

            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center gap-4 text-xs text-zinc-300 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Capital Preservation Mode Active
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Min Advantage: +3.0¢ / contract
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Min Net Return: +5.0% ROI
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const opp = currentOpp;
  const isYes = opp.action === 'BUY_YES';

  const rawEdge = String(opp.conservative_edge || '0');
  const edgeNum = parseFloat(rawEdge.replace('+', '').replace('$', '')) || 0;
  const edgeDisplay = `+$${edgeNum.toFixed(3)}`;

  const rawRoi = String(opp.net_roi || '0');
  let roiDisplay = '+0.0%';
  if (rawRoi.includes('%')) {
    roiDisplay = rawRoi.startsWith('+') ? rawRoi : `+${rawRoi}`;
  } else {
    const num = parseFloat(rawRoi) || 0;
    roiDisplay = `+${(num < 2 ? num * 100 : num).toFixed(1)}%`;
  }

  const contracts = parseInt(opp.recommended_contracts) || 1;
  const entryPrice = parseFloat(opp.entry_price || '0.01');
  const maxEntryPrice = opp.max_entry_price ? parseFloat(opp.max_entry_price) : entryPrice;
  const stakeCost = opp.recommended_stake 
    ? parseFloat(opp.recommended_stake).toFixed(2)
    : (contracts * entryPrice).toFixed(2);

  const maxLoss = opp.max_loss ? parseFloat(opp.max_loss).toFixed(2) : stakeCost;
  const maxProfit = opp.max_profit 
    ? parseFloat(opp.max_profit).toFixed(2) 
    : ((contracts * 1.0) - parseFloat(stakeCost)).toFixed(2);

  const matchedMarket = markets.find((m) => m.ticker === opp.ticker);
  const displayTitle = marketTitle || matchedMarket?.title || opp.ticker;

  // Verified Kalshi Destination URL
  const seriesTicker = opp.ticker.split('-')[0].toLowerCase();
  const verifiedKalshiUrl = `https://kalshi.com/markets/${seriesTicker}`;

  // Navigation handlers
  const handlePrev = () => {
    if (!onSelectIndex || totalOpps === 0) return;
    const nextIdx = selectedIndex > 0 ? selectedIndex - 1 : totalOpps - 1;
    onSelectIndex(nextIdx);
  };

  const handleNext = () => {
    if (!onSelectIndex || totalOpps === 0) return;
    const nextIdx = selectedIndex < totalOpps - 1 ? selectedIndex + 1 : 0;
    onSelectIndex(nextIdx);
  };

  return (
    <div className="bg-[#0e1417] border-2 border-emerald-500/60 rounded-3xl p-4 sm:p-7 shadow-2xl shadow-emerald-950/30 relative overflow-hidden space-y-5">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Multi-Trade Selector Bar */}
      {totalOpps > 1 && (
        <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
              <Layers className="w-3.5 h-3.5" />
              {totalOpps} Ranked Trades
            </span>
            <span className="text-xs font-mono text-zinc-400">
              #{selectedIndex + 1} of {totalOpps}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-mono"
              title="Previous recommendation"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-mono"
              title="Next recommendation"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Opportunity Carousel Pills */}
      {opportunities.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {opportunities.map((o, idx) => {
            const isSelected = idx === selectedIndex;
            const shortTicker = o.ticker.replace('KXHIGH', '').replace('KXLOW', '');
            return (
              <button
                key={o.ticker + idx}
                onClick={() => onSelectIndex && onSelectIndex(idx)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-zinc-950 shadow-md ring-2 ring-emerald-400'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <span>#{idx + 1} {shortTicker}</span>
                <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-zinc-950/20 text-zinc-950 font-black' : 'text-emerald-400'}`}>
                  {o.net_roi}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-lg">
            <ShieldCheck className="h-3.5 w-3.5" />
            TOP QUALIFIED LIVE TRADE
          </span>
          <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
            Model: {opp.model}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleWatchlist && (
            <button
              onClick={() => onToggleWatchlist(opp.ticker)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isWatchlisted
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          <div className="text-xs text-zinc-400 font-mono">
            <span>Expires: {data?.expires_at ? new Date(data.expires_at).toLocaleTimeString() : 'Active'}</span>
          </div>
        </div>
      </div>

      {/* Active Position Holding Alert */}
      {(() => {
        const holding = positions?.find(p => p.ticker === opp.ticker);
        if (!holding) return null;
        const contractsNum = parseFloat(holding.contracts || '0');
        const costNum = parseFloat(holding.cost_basis || '0');
        const maxPayoutNum = holding.max_payout ? parseFloat(holding.max_payout) : (contractsNum * 1.0);
        return (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 font-mono text-xs gap-3 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="font-black text-white text-xs sm:text-sm block tracking-wide">
                  ACTIVE HOLDING: YOU CURRENTLY OWN THIS MARKET
                </span>
                <span className="text-zinc-300 text-xs">
                  Holding <strong className="text-white font-bold">{holding.contracts} contracts</strong> on {holding.side.toUpperCase()} @ {holding.avg_entry_cents || '$' + holding.avg_entry}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs self-end sm:self-auto bg-zinc-950/70 px-3 py-1.5 rounded-xl border border-zinc-800">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Invested</span>
                <span className="text-white font-bold">${costNum.toFixed(2)}</span>
              </div>
              <div className="w-px h-5 bg-zinc-800" />
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Max Payout</span>
                <span className="text-emerald-400 font-black">${maxPayoutNum.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Contract Details */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            {opp.ticker}
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{opp.category}</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
          {displayTitle}
        </h2>
      </div>

      {/* Key Metric Blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
            Executable Entry
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            ${entryPrice.toFixed(2)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">Max limit: ${maxEntryPrice.toFixed(2)}</div>
        </div>

        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
            Conservative ROI
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {roiDisplay}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">Edge: {edgeDisplay}/ct</div>
        </div>

        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
            Model vs Market
          </div>
          <div className="text-lg sm:text-2xl font-black text-sky-400 font-mono">
            {(parseFloat(opp.estimated_probability || '0') * 100).toFixed(0)}% <span className="text-xs text-zinc-500 font-normal">vs</span> {(parseFloat(opp.market_probability || opp.entry_price || '0') * 100).toFixed(0)}¢
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">True advantage</div>
        </div>

        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mb-0.5">
            P&amp;L Potential
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-400 font-mono">
            +${maxProfit}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">Max Loss: ${maxLoss}</div>
        </div>
      </div>

      {/* THREE PROMINENT PRIMARY ACTIONS (User Prompt Requirement 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Action 1: View Complete Analysis */}
        <button
          onClick={() => setShowFullAnalysis(!showFullAnalysis)}
          className="py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-750 text-white font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
        >
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>{showFullAnalysis ? 'Hide Analysis' : 'Complete Analysis'}</span>
          {showFullAnalysis ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Action 2: Preview Trade (Opens Mobile Drawer) */}
        <button
          onClick={() => onExecute(opp.ticker, isYes ? 'yes' : 'no', contracts, entryPrice)}
          disabled={isExecuting}
          className={`py-3 px-5 rounded-2xl font-mono font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xl disabled:opacity-50 ${
            isYes
              ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
              : 'bg-rose-500 hover:bg-rose-400 text-white'
          }`}
        >
          <span>Preview {opp.action} (${stakeCost})</span>
          <ArrowUpRight className="w-4 h-4 stroke-[3]" />
        </button>

        {/* Action 3: View on Kalshi (Verified Destination URL) */}
        <a
          href={verifiedKalshiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 px-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
          title={`Open verified Kalshi market: ${verifiedKalshiUrl}`}
        >
          <span>View on Kalshi</span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </a>
      </div>

      {/* EXPANDABLE COMPLETE ANALYSIS PANEL */}
      {showFullAnalysis && (
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-emerald-500/30 shadow-lg space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider font-mono">
                Multi-Agent Mathematical Evidence &amp; Sizing
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              Verified Kalshi Settlement
            </span>
          </div>

          <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
            <p className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
              <span>💡</span> Quantitative Thesis &amp; Edge Breakdown:
            </p>
            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-3">
              {opp.evidence_summary || 
                `Our quantitative ensemble model calculated a ${(parseFloat(opp.estimated_probability || '0') * 100).toFixed(1)}% fair-value probability for ${opp.ticker}, while the Kalshi order book is mispricing contracts at only $${parseFloat(opp.entry_price || '0').toFixed(2)}. After factoring in exchange taker fees and execution slippage, this discrepancy yields a conservative statistical edge of +$${edgeNum.toFixed(3)}/contract (+${roiDisplay} Net ROI).`}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs font-mono border-t border-zinc-800/80">
              <div>
                <span className="text-zinc-500 block text-[10px]">Model Probability:</span>
                <span className="text-emerald-400 font-bold">{(parseFloat(opp.estimated_probability || '0') * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Conservative 95% Bound:</span>
                <span className="text-sky-400 font-bold">{(parseFloat(opp.conservative_probability || opp.estimated_probability || '0') * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Market Implied:</span>
                <span className="text-white font-bold">${parseFloat(opp.entry_price || '0').toFixed(2)} / ct</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Allocated Stake:</span>
                <span className="text-amber-400 font-bold">{contracts} contracts (${stakeCost})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
