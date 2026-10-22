import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  Zap, 
  Info,
  DollarSign,
  Minus,
  Plus
} from 'lucide-react';
import type { Market } from '../types';

interface TradeDrawerProps {
  market: Market | null;
  isOpen: boolean;
  onClose: () => void;
  onExecute: (ticker: string, side: 'yes' | 'no', contracts: number, price: number) => void;
  isExecuting?: boolean;
}

export const TradeDrawer: React.FC<TradeDrawerProps> = ({
  market,
  isOpen,
  onClose,
  onExecute,
  isExecuting = false,
}) => {
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [contracts, setContracts] = useState<number>(10);
  const [price, setPrice] = useState<number>(0.50);

  useEffect(() => {
    if (market) {
      if (side === 'yes' && market.yes_ask) {
        setPrice(parseFloat(market.yes_ask));
      } else if (side === 'no' && market.yes_bid) {
        setPrice(parseFloat((1.0 - parseFloat(market.yes_bid)).toFixed(2)));
      } else {
        setPrice(0.50);
      }
    }
  }, [market, side]);

  if (!isOpen || !market) return null;

  // Exact Kalshi Quadratic Taker Fee calculation:
  // Fee = ceil(0.07 * C * P * (1 - P) * 100) / 100
  const grossCost = contracts * price;
  const rawFee = 0.07 * contracts * price * (1.0 - price);
  const takerFee = Math.ceil(rawFee * 100) / 100;
  const totalCost = grossCost + takerFee;
  const maxPayout = contracts * 1.0;
  const netProfit = Math.max(0, maxPayout - totalCost);
  const netRoiPct = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  const handleQuickAdd = (amount: number) => {
    setContracts(prev => Math.max(1, prev + amount));
  };

  const handleSetContracts = (amount: number) => {
    setContracts(Math.max(1, amount));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute(market.ticker, side, contracts, price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b1013] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Drawer Drag Bar (Mobile) */}
        <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-start justify-between">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {market.category || 'General'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Book
              </span>
            </div>
            <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
              {market.title}
            </h3>
            <div className="text-xs font-mono text-zinc-400 mt-0.5">
              {market.ticker}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body / Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Side Selector (YES / NO Tabs) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setSide('yes')}
              className={`py-2.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 ${
                side === 'yes'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>BUY YES</span>
              <span className="text-[11px] font-normal opacity-90">
                {market.yes_ask ? `@ $${market.yes_ask}` : ''}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSide('no')}
              className={`py-2.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 ${
                side === 'no'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>BUY NO</span>
              <span className="text-[11px] font-normal opacity-90">
                {market.yes_bid ? `@ $${(1.0 - parseFloat(market.yes_bid)).toFixed(2)}` : ''}
              </span>
            </button>
          </div>

          {/* Price & Contracts Steppers */}
          <div className="grid grid-cols-2 gap-3">
            {/* Price Input */}
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <label className="text-[10px] font-mono text-zinc-400 uppercase block">Limit Price</label>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPrice(p => Math.max(0.01, parseFloat((p - 0.01).toFixed(2))))}
                  className="p-1 rounded bg-zinc-900 text-zinc-300 hover:text-white"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="text-base font-bold font-mono text-white">
                  ${price.toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => setPrice(p => Math.min(0.99, parseFloat((p + 0.01).toFixed(2))))}
                  className="p-1 rounded bg-zinc-900 text-zinc-300 hover:text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Contracts Input */}
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <label className="text-[10px] font-mono text-zinc-400 uppercase block">Quantity</label>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleQuickAdd(-5)}
                  className="p-1 rounded bg-zinc-900 text-zinc-300 hover:text-white"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="text-base font-bold font-mono text-white">
                  {contracts}x
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(5)}
                  className="p-1 rounded bg-zinc-900 text-zinc-300 hover:text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Quantity Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[5, 10, 25, 50, 100].map(qty => (
              <button
                key={qty}
                type="button"
                onClick={() => handleSetContracts(qty)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition shrink-0 ${
                  contracts === qty
                    ? 'bg-zinc-800 border-zinc-600 text-white'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {qty}
              </button>
            ))}
          </div>

          {/* Quantitative Mathematics Breakdown */}
          <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/80 space-y-2 text-xs font-mono">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-800/60 pb-1 flex items-center justify-between">
              <span>Financial Economics</span>
              <span>Kalshi Quadratic Fee</span>
            </div>

            <div className="flex justify-between text-zinc-400">
              <span>Gross Outlay ({contracts} contracts)</span>
              <span className="text-white">${grossCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-zinc-400">
              <span className="flex items-center gap-1">
                <span>Taker Fee (Exact Quadratic)</span>
                <Info className="w-3 h-3 text-zinc-500" />
              </span>
              <span className="text-amber-400 font-semibold">+${takerFee.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-zinc-200 font-bold pt-1 border-t border-zinc-800/60">
              <span>Total Capital Required</span>
              <span className="text-emerald-400">${totalCost.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                <span className="text-zinc-500 block">Max Profit</span>
                <span className="text-emerald-400 font-bold mt-0.5 block">+${netProfit.toFixed(2)}</span>
              </div>
              <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
                <span className="text-zinc-500 block">Net ROI</span>
                <span className="text-sky-400 font-bold mt-0.5 block">+{netRoiPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isExecuting}
              className={`w-full py-3.5 px-4 rounded-xl font-bold font-mono text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                side === 'yes'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-rose-500/20'
              } disabled:opacity-50`}
            >
              {isExecuting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Order...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  <span>Submit {side.toUpperCase()} Order (${totalCost.toFixed(2)})</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-zinc-500 text-center font-mono mt-2">
              Protected by fractional Kelly limits and independent risk governor
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
