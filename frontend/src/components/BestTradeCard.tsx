import React from 'react';
import { ShieldCheck, AlertCircle, ArrowUpRight, TrendingUp, DollarSign, Clock, HelpCircle } from 'lucide-react';
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
      <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-zinc-800 rounded mb-4" />
        <div className="h-20 bg-zinc-800/50 rounded mb-4" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-12 bg-zinc-800/40 rounded" />
          <div className="h-12 bg-zinc-800/40 rounded" />
          <div className="h-12 bg-zinc-800/40 rounded" />
          <div className="h-12 bg-zinc-800/40 rounded" />
        </div>
      </div>
    );
  }

  if (!data.available || !data.opportunity) {
    return (
      <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
            <HelpCircle className="h-6 w-6 text-zinc-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                CIO DECISION
              </span>
              <span className="text-xs font-mono text-zinc-500">
                {data.checked_at ? new Date(data.checked_at).toLocaleTimeString() : ''}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mb-2">
              NO QUALIFIED TRADE AVAILABLE
            </h2>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              {data.reason ||
                'The quantitative forecasting engine has analyzed all active Kalshi markets. No contract currently exhibits a statistically defensible edge exceeding exchange fees, slippage, and calibrated uncertainty bounds.'}
            </p>
            <div className="mt-4 pt-4 border-t border-zinc-800/60 flex flex-wrap items-center gap-6 text-xs font-mono text-zinc-500">
              <span>Risk Policy: Capital Preservation</span>
              <span>Min Conservative Edge: $0.03/contract</span>
              <span>Min Net ROI: 5.0%</span>
              <span className="text-emerald-500">System Standing By For Valid Discrepancies</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const opp = data.opportunity;
  const isYes = opp.action === 'BUY_YES';

  return (
    <div className="bg-[#0e1417] border border-emerald-500/40 rounded-xl p-6 shadow-lg shadow-emerald-950/20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            BEST LIVE OPPORTUNITY
          </span>
          <span className="font-mono text-xs text-zinc-500">
            Expires: {data.expires_at ? new Date(data.expires_at).toLocaleTimeString() : '120s'}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
          <span>Model: {opp.model}</span>
        </div>
      </div>

      {/* Contract & Action Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-emerald-400 font-semibold">{opp.ticker}</span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="font-mono text-xs text-zinc-400 uppercase">{opp.category}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {opp.ticker}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-lg font-mono font-bold text-base tracking-wider ${
              isYes
                ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300'
                : 'bg-indigo-500/20 border border-indigo-500/60 text-indigo-300'
            }`}
          >
            {opp.action}
          </div>

          <button
            onClick={() =>
              onExecute(
                opp.ticker,
                isYes ? 'yes' : 'no',
                parseInt(opp.recommended_contracts) || 1,
                parseFloat(opp.max_entry_price)
              )
            }
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm tracking-wide transition shadow disabled:opacity-50"
          >
            <span>Execute Trade</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 font-mono">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
          <span className="text-[10px] text-zinc-500 uppercase block">Executable Entry</span>
          <span className="text-lg font-bold text-white">${opp.entry_price}</span>
          <span className="text-[10px] text-zinc-500 block">Max: ${opp.max_entry_price}</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
          <span className="text-[10px] text-zinc-500 uppercase block">Estimated Prob</span>
          <span className="text-lg font-bold text-emerald-400">
            {(parseFloat(opp.estimated_probability) * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-zinc-500 block">
            Cons: {(parseFloat(opp.conservative_probability) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
          <span className="text-[10px] text-zinc-500 uppercase block">Market Prob</span>
          <span className="text-lg font-bold text-zinc-300">
            {opp.market_probability
              ? `${(parseFloat(opp.market_probability) * 100).toFixed(1)}%`
              : 'N/A'}
          </span>
          <span className="text-[10px] text-zinc-500 block">Order Book Mid</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
          <span className="text-[10px] text-zinc-500 uppercase block">Net Expected ROI</span>
          <span className="text-lg font-bold text-emerald-400">
            +{(parseFloat(opp.net_roi) * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-zinc-500 block">
            Edge: {parseFloat(opp.conservative_edge) >= 0 ? '+' : ''}
            ${parseFloat(opp.conservative_edge).toFixed(3)}
          </span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
          <span className="text-[10px] text-zinc-500 uppercase block">Risk Allocation</span>
          <span className="text-lg font-bold text-white">${opp.recommended_stake}</span>
          <span className="text-[10px] text-zinc-500 block">{opp.recommended_contracts} contracts</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
          <span className="text-[10px] text-zinc-500 uppercase block">Max Profit / Loss</span>
          <span className="text-lg font-bold text-emerald-400">+${opp.max_profit}</span>
          <span className="text-[10px] text-rose-400 block">-${opp.max_loss}</span>
        </div>
      </div>

      {/* Evidence Explanation */}
      <div className="p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed font-sans">
        <span className="font-semibold text-white mr-1.5 font-mono">EVIDENCE & RATIONALE:</span>
        {opp.evidence_summary}
      </div>
    </div>
  );
};
