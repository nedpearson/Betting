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
  ArrowRight
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
}) => {
  const [activeTab, setActiveTab] = useState<'thesis' | 'all'>('thesis');

  // If opportunities are available, allow browsing through all of them
  const currentOpp: Opportunity | undefined = 
    opportunities.length > 0 && selectedIndex < opportunities.length
      ? opportunities[selectedIndex]
      : data?.opportunity;

  const totalOpps = opportunities.length > 0 ? opportunities.length : (data?.opportunity ? 1 : 0);

  if (!data && opportunities.length === 0) {
    return (
      <div className="bg-[#0e1417] border border-zinc-800 rounded-3xl p-8 animate-pulse">
        <div className="h-8 w-64 bg-zinc-800 rounded-xl mb-4" />
        <div className="h-24 bg-zinc-800/50 rounded-2xl mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-16 bg-zinc-800/40 rounded-2xl" />
          <div className="h-16 bg-zinc-800/40 rounded-2xl" />
          <div className="h-16 bg-zinc-800/40 rounded-2xl" />
          <div className="h-16 bg-zinc-800/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!currentOpp) {
    return (
      <div className="bg-[#0e1417] border-2 border-zinc-800 hover:border-zinc-700 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 shrink-0">
            <Sparkles className="h-8 w-8 text-emerald-400" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                QUANTITATIVE CHIEF INVESTMENT OFFICER
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {data?.checked_at ? new Date(data.checked_at).toLocaleTimeString() : ''}
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              PATIENT DISCIPLINE: STANDING BY FOR DEFENSIVE EDGE
            </h2>
            
            <p className="text-base sm:text-lg text-zinc-300 max-w-3xl leading-relaxed">
              {data?.reason ||
                'Our 16 quantitative agents are continuously evaluating 1,000+ live contracts across weather, sports, and crypto. We only alert you when a trade has a mathematically proven advantage exceeding Kalshi trading fees, slippage, and uncertainty bounds.'}
            </p>

            <div className="mt-6 pt-5 border-t border-zinc-800/80 flex flex-wrap items-center gap-6 text-sm text-zinc-300 font-medium">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Capital Preservation Mode Active
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Min Advantage: +3.0¢ / contract
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Min Net Return: +5.0% ROI
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
  const entryPrice = parseFloat(opp.entry_price || opp.max_entry_price || '0.50');
  const stakeCost = opp.recommended_stake 
    ? parseFloat(opp.recommended_stake).toFixed(2)
    : (contracts * entryPrice).toFixed(2);

  const matchedMarket = markets.find((m) => m.ticker === opp.ticker);
  const displayTitle = marketTitle || matchedMarket?.title || opp.ticker;

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
    <div className="bg-[#0e1417] border-2 border-emerald-500/60 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-emerald-950/30 relative overflow-hidden space-y-6">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Multi-Trade Selector Bar: Clearly shows all available recommendations */}
      {totalOpps > 1 && (
        <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
              <Layers className="w-3.5 h-3.5" />
              {totalOpps} AI Recommendations Available
            </span>
            <span className="text-xs font-mono text-zinc-400">
              Viewing #{selectedIndex + 1} of {totalOpps}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-mono"
              title="Previous recommendation"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition active:scale-95 cursor-pointer flex items-center gap-1 text-xs font-mono"
              title="Next recommendation"
            >
              <span>Next</span>
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
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500 text-zinc-950 text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg">
            <ShieldCheck className="h-4 w-4" />
            TOP MATHEMATICAL OPPORTUNITY #{selectedIndex + 1}
          </span>
          <span className="text-xs sm:text-sm text-zinc-400 font-mono">
            Model: {opp.model}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400 font-mono">
          <span>Expires: {data?.expires_at ? new Date(data.expires_at).toLocaleTimeString() : 'Active'}</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 font-mono text-xs gap-3 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="font-black text-white text-sm block tracking-wide">
                  ACTIVE HOLDING: YOU CURRENTLY OWN THIS MARKET
                </span>
                <span className="text-zinc-300 text-xs">
                  Holding <strong className="text-white font-bold">{holding.contracts} contracts</strong> on {holding.side.toUpperCase()} @ {holding.avg_entry_cents || '$' + holding.avg_entry}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-5 text-xs self-end sm:self-auto bg-zinc-950/70 px-4 py-2 rounded-xl border border-zinc-800">
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Invested</span>
                <span className="text-white font-bold">${costNum.toFixed(2)}</span>
              </div>
              <div className="w-px h-6 bg-zinc-800" />
              <div>
                <span className="text-zinc-400 block text-[10px] uppercase font-bold">Max Payout</span>
                <span className="text-emerald-400 font-black">${maxPayoutNum.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Contract & Action Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              {opp.ticker}
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{opp.category}</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
            {displayTitle}
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onExecute(opp.ticker, isYes ? 'yes' : 'no', contracts, entryPrice)}
            className={`px-5 py-3 rounded-2xl font-black text-lg sm:text-xl tracking-wider shadow-md transition active:scale-95 cursor-pointer ${
              isYes
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                : 'bg-rose-500 hover:bg-rose-400 text-white'
            }`}
            title="Execute recommendation"
          >
            {opp.action}
          </button>

          <button
            onClick={() => onExecute(opp.ticker, isYes ? 'yes' : 'no', contracts, entryPrice)}
            disabled={isExecuting}
            className="h-14 px-6 sm:px-8 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-base sm:text-lg transition active:scale-95 flex items-center gap-2.5 shadow-xl disabled:opacity-50 cursor-pointer"
          >
            <span>Execute Trade</span>
            <ArrowUpRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Key Metric Blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">
            Conservative Edge
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {edgeDisplay}
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-medium">After all exchange fees</div>
        </div>

        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">
            Net Return (ROI)
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {roiDisplay}
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-medium">Expected net yield</div>
        </div>

        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">
            Model vs Market
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
            {(parseFloat(opp.estimated_probability || '0') * 100).toFixed(0)}% <span className="text-xs text-zinc-500 font-normal">vs</span> {(parseFloat(opp.market_probability || opp.entry_price || '0') * 100).toFixed(0)}¢
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-medium">True probability advantage</div>
        </div>

        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">
            Suggested Size
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {contracts} <span className="text-sm text-zinc-400 font-bold">contracts</span>
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-medium">
            Risk: ${stakeCost}
          </div>
        </div>
      </div>

      {/* DEDICATED AI SYNTHESIS & CHATGPT-GRADE THESIS PANEL */}
      <div className="p-5 rounded-2xl bg-zinc-950 border border-emerald-500/30 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                AI RESEARCH THESIS & QUANTITATIVE RATIONALE
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </span>
              <span className="text-[11px] text-zinc-400 font-mono block">
                Synthesized across 16 Autonomous Agents & Multi-Model Forecast Feeds
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            {opp.category}
          </span>
        </div>

        {/* Narrative Synthesis */}
        <div className="text-sm text-zinc-300 leading-relaxed font-sans bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
          <p className="font-medium text-white mb-2">
            💡 <strong className="text-emerald-400">Why the AI Recommends this Trade:</strong>
          </p>
          <p className="text-zinc-300 text-sm leading-relaxed mb-3">
            {opp.evidence_summary || 
              `Our quantitative ensemble model calculated a ${(parseFloat(opp.estimated_probability || '0') * 100).toFixed(1)}% fair-value probability for ${opp.ticker}, while the Kalshi order book is mispricing contracts at only $${parseFloat(opp.entry_price || '0').toFixed(2)}. After factoring in exchange taker fees and execution slippage, this discrepancy yields a conservative statistical edge of +$${edgeNum.toFixed(3)}/contract (+${roiDisplay} Net ROI).`}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono border-t border-zinc-800/80">
            <div className="text-zinc-400">
              <span className="text-zinc-500 block">AI Fair Probability:</span>
              <span className="text-emerald-400 font-bold text-sm">{(parseFloat(opp.estimated_probability || '0') * 100).toFixed(1)}%</span>
            </div>
            <div className="text-zinc-400">
              <span className="text-zinc-500 block">Kalshi Market Price:</span>
              <span className="text-white font-bold text-sm">${parseFloat(opp.entry_price || '0').toFixed(2)} / contract</span>
            </div>
            <div className="text-zinc-400">
              <span className="text-zinc-500 block">Kelly Capital Allocation:</span>
              <span className="text-amber-400 font-bold text-sm">{contracts} contracts (${stakeCost} max risk)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
