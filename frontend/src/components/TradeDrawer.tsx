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
  Plus,
  Lock
} from 'lucide-react';
import type { Market } from '../types';

interface TradeDrawerProps {
  market: Market | null;
  isOpen: boolean;
  onClose: () => void;
  onExecute: (ticker: string, side: 'yes' | 'no', contracts: number, price: number) => void;
  isExecuting?: boolean;
  initialSide?: 'yes' | 'no';
  initialContracts?: number;
  initialPrice?: number;
}

export const TradeDrawer: React.FC<TradeDrawerProps> = ({
  market,
  isOpen,
  onClose,
  onExecute,
  isExecuting = false,
  initialSide = 'yes',
  initialContracts = 10,
  initialPrice,
}) => {
  const [side, setSide] = useState<'yes' | 'no'>(initialSide);
  const [contracts, setContracts] = useState<number>(initialContracts);
  const [price, setPrice] = useState<number>(initialPrice || 0.50);

  useEffect(() => {
    if (market && isOpen) {
      if (initialSide) setSide(initialSide);
      if (initialContracts) setContracts(initialContracts);
      if (initialPrice !== undefined && initialPrice > 0) {
        setPrice(initialPrice);
      } else if (side === 'yes' && market.yes_ask) {
        setPrice(parseFloat(market.yes_ask));
      } else if (side === 'no' && market.yes_bid) {
        setPrice(parseFloat((1.0 - parseFloat(market.yes_bid)).toFixed(2)));
      } else {
        setPrice(0.50);
      }
    }
  }, [market, isOpen, initialSide, initialContracts, initialPrice]);

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1013] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl max-h-[95vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Drawer Drag Bar (Mobile) */}
        <div className="w-14 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3.5 sm:hidden shrink-0" />

        {/* Drawer Header (Large & Clear) */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                {market.category || 'General'}
              </span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Orderbook
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
              {market.title}
            </h3>
            <div className="text-xs font-mono text-zinc-400 mt-1 font-semibold">
              {market.ticker}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition shrink-0 border border-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Side Selector (BUY YES vs BUY NO - Huge Buttons) */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-950 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setSide('yes')}
              className={`py-4 rounded-xl text-sm sm:text-base font-black transition flex flex-col items-center justify-center gap-1 ${
                side === 'yes'
                  ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>BUY YES</span>
              <span className="text-xs font-semibold opacity-90 font-mono">
                {market.yes_ask ? `@ $${market.yes_ask}` : 'Market Ask'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSide('no')}
              className={`py-4 rounded-xl text-sm sm:text-base font-black transition flex flex-col items-center justify-center gap-1 ${
                side === 'no'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>BUY NO</span>
              <span className="text-xs font-semibold opacity-90 font-mono">
                {market.yes_bid ? `@ $${(1.0 - parseFloat(market.yes_bid)).toFixed(2)}` : 'Market Bid'}
              </span>
            </button>
          </div>

          {/* Price & Contracts Steppers (Large Controls) */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Limit Price */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Limit Price</label>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPrice(p => Math.max(0.01, parseFloat((p - 0.01).toFixed(2))))}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 active:scale-95 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="text-xl sm:text-2xl font-black font-mono text-white">
                  ${price.toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => setPrice(p => Math.min(0.99, parseFloat((p + 0.01).toFixed(2))))}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 active:scale-95 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contracts Quantity */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Contracts</label>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleQuickAdd(-5)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 active:scale-95 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                  {contracts}x
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(5)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 active:scale-95 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Quantity Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[5, 10, 25, 50, 100].map(qty => (
              <button
                key={qty}
                type="button"
                onClick={() => handleSetContracts(qty)}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold font-mono transition ${
                  contracts === qty
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                +{qty}
              </button>
            ))}
          </div>

          {/* Quantitative Mathematics & Quadratic Fee Breakdown */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 text-sm">
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800/80 pb-2 flex items-center justify-between">
              <span>Financial Economics</span>
              <span className="text-emerald-400">Kalshi Fee Formula Active</span>
            </div>

            <div className="flex justify-between text-zinc-300">
              <span>Gross Contracts Cost ({contracts}x @ ${price.toFixed(2)})</span>
              <span className="text-white font-mono font-bold">${grossCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span>Exchange Taker Fee</span>
                <span className="text-xs text-zinc-500">(0.07 × C × P × [1-P])</span>
              </span>
              <span className="text-amber-400 font-mono font-bold">+${takerFee.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-white font-black text-base pt-2 border-t border-zinc-800">
              <span>Total Capital Committed</span>
              <span className="text-emerald-400 font-mono">${totalCost.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400 block font-medium">Max Net Payout</span>
                <span className="text-emerald-400 font-black font-mono text-base mt-0.5 block">+${netProfit.toFixed(2)}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400 block font-medium">Expected Net Yield</span>
                <span className="text-sky-400 font-black font-mono text-base mt-0.5 block">+{netRoiPct.toFixed(1)}% ROI</span>
              </div>
            </div>
          </div>

          {/* Big Action Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isExecuting}
              className={`w-full h-16 px-6 rounded-2xl font-black text-base sm:text-lg shadow-xl transition flex items-center justify-center gap-3 active:scale-95 ${
                side === 'yes'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-emerald-500/25'
                  : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-rose-500/25'
              } disabled:opacity-50`}
            >
              {isExecuting ? (
                <>
                  <div className="w-5 h-5 border-3 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Order to Engine...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  <span>Submit {side.toUpperCase()} Bet (${totalCost.toFixed(2)})</span>
                </>
              )}
            </button>
            <p className="text-xs text-zinc-400 text-center font-medium mt-2.5">
              Gated by independent risk governor, maximum drawdown guards, and fractional Kelly limits
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
