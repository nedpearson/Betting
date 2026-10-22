import React from 'react';
import { ShieldCheck, AlertCircle, ArrowUpRight, TrendingUp, DollarSign, Clock, HelpCircle, CheckCircle2, Sparkles } from 'lucide-react';
import type { BestTradeResponse } from '../types';

interface BestTradeCardProps {
  data: BestTradeResponse | null;
  onExecute: (ticker: string, side: 'yes' | 'no', contracts: number, price: number) => void;
  isExecuting?: boolean;
}

export const BestTradeCard: React.FC<BestTradeCardProps> = ({
  data,
  onExecute,
  isExecuting,
}) => {
  if (!data) {
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

  if (!data.available || !data.opportunity) {
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
                {data.checked_at ? new Date(data.checked_at).toLocaleTimeString() : ''}
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              PATIENT DISCIPLINE: STANDING BY FOR DEFENSIVE EDGE
            </h2>
            
            <p className="text-base sm:text-lg text-zinc-300 max-w-3xl leading-relaxed">
              {data.reason ||
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

  const opp = data.opportunity;
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
  const stakeCost = opp.recommended_stake 
    ? parseFloat(opp.recommended_stake).toFixed(2)
    : (contracts * (parseFloat(opp.entry_price || opp.max_entry_price || '0.50'))).toFixed(2);

  return (
    <div className="bg-[#0e1417] border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/30 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500 text-zinc-950 text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg">
            <ShieldCheck className="h-4 w-4" />
            TOP MATHEMATICAL OPPORTUNITY
          </span>
          <span className="text-xs sm:text-sm text-zinc-400 font-mono">
            Expires: {data.expires_at ? new Date(data.expires_at).toLocaleTimeString() : '120s'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300 font-semibold font-mono">
          <span>Model: {opp.model}</span>
        </div>
      </div>

      {/* Contract & Action Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              {opp.ticker}
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{opp.category}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {opp.ticker}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              onExecute(
                opp.ticker,
                isYes ? 'yes' : 'no',
                contracts,
                parseFloat(opp.max_entry_price || opp.entry_price || '0.50')
              )
            }
            className={`px-5 py-3 rounded-2xl font-black text-lg sm:text-xl tracking-wider shadow-md transition active:scale-95 cursor-pointer ${
              isYes
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                : 'bg-rose-500 hover:bg-rose-400 text-white'
            }`}
            title="Click to place bet"
          >
            {opp.action}
          </button>

          <button
            onClick={() =>
              onExecute(
                opp.ticker,
                isYes ? 'yes' : 'no',
                contracts,
                parseFloat(opp.max_entry_price || opp.entry_price || '0.50')
              )
            }
            disabled={isExecuting}
            className="h-14 px-8 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-base sm:text-lg transition active:scale-95 flex items-center gap-2.5 shadow-xl disabled:opacity-50"
          >
            <span>Execute Trade</span>
            <ArrowUpRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Key Metric Blocks (Big & Clear) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">
            Conservative Edge
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {edgeDisplay}
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-medium">After all exchange fees</div>
        </div>

        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">
            Net Return (ROI)
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {roiDisplay}
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-medium">Expected net yield</div>
        </div>

        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">
            Model vs Market
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
            {(parseFloat(opp.estimated_probability || (opp as any).model_prob || '0') * 100).toFixed(0)}% <span className="text-xs text-zinc-500 font-normal">vs</span> {(parseFloat(opp.market_probability || opp.entry_price || (opp as any).market_price || '0') * 100).toFixed(0)}¢
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-medium">True probability advantage</div>
        </div>

        <div className="bg-[#080c0e] border border-zinc-800 rounded-2xl p-5 shadow-sm">
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
    </div>
  );
};
