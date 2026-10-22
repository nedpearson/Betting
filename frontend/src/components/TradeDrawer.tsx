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
  availableCash?: string | number;
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
  availableCash = '0.00',
}) => {
  const [side, setSide] = useState<'yes' | 'no'>(initialSide);
  const [contracts, setContracts] = useState<number>(initialContracts);
  const [price, setPrice] = useState<number>(initialPrice || 0.50);
  const [dollarAmount, setDollarAmount] = useState<string>('');

  useEffect(() => {
    if (market && isOpen) {
      const s = initialSide || 'yes';
      setSide(s);

      let p = initialPrice && initialPrice > 0 ? initialPrice : 0.50;
      if (!initialPrice) {
        if (s === 'yes' && market.yes_ask) {
          p = parseFloat(market.yes_ask);
        } else if (s === 'no' && market.yes_bid) {
          p = parseFloat((1.0 - parseFloat(market.yes_bid)).toFixed(2));
        }
      }
      p = Math.max(0.01, Math.min(0.99, parseFloat(p.toFixed(2))));
      setPrice(p);

      const c = initialContracts && initialContracts > 0 ? initialContracts : 10;
      setContracts(c);
      setDollarAmount((c * p).toFixed(2));
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

  const availableCashNum = parseFloat(String(availableCash || '0')) || 0;
  const isInsufficient = availableCashNum > 0 && totalCost > availableCashNum;

  const handleContractsChange = (num: number) => {
    const valid = Math.max(1, num);
    setContracts(valid);
    setDollarAmount((valid * price).toFixed(2));
  };

  const handleDollarChange = (valStr: string) => {
    setDollarAmount(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0 && price > 0) {
      const calculatedContracts = Math.max(1, Math.round(parsed / price));
      setContracts(calculatedContracts);
    }
  };

  const handlePriceChange = (newPrice: number) => {
    const p = Math.max(0.01, Math.min(0.99, parseFloat(newPrice.toFixed(2))));
    setPrice(p);
    setDollarAmount((contracts * p).toFixed(2));
  };

  const handleSideToggle = (newSide: 'yes' | 'no') => {
    setSide(newSide);
    if (market) {
      let p = price;
      if (newSide === 'yes' && market.yes_ask) {
        p = parseFloat(market.yes_ask);
      } else if (newSide === 'no' && market.yes_bid) {
        p = parseFloat((1.0 - parseFloat(market.yes_bid)).toFixed(2));
      }
      p = Math.max(0.01, Math.min(0.99, parseFloat(p.toFixed(2))));
      setPrice(p);
      setDollarAmount((contracts * p).toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecute(market.ticker, side, contracts, parseFloat(price.toFixed(2)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1013] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl max-h-[95vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Drawer Drag Bar (Mobile) */}
        <div className="w-14 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3.5 sm:hidden shrink-0" />

        {/* Drawer Header */}
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
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Form Body */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            
            {/* Side Selector (Outcome: YES vs NO) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span className="font-bold text-zinc-300">1. CHOOSE OUTCOME</span>
                <span className="text-[11px] text-zinc-500">Selected: {side.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => handleSideToggle('yes')}
                  className={`py-3.5 rounded-xl text-sm font-black transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    side === 'yes'
                      ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-400'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={`w-4 h-4 ${side === 'yes' ? 'opacity-100' : 'opacity-0'}`} />
                    <span>OUTCOME: YES</span>
                  </div>
                  <span className="text-xs font-semibold opacity-90 font-mono">
                    {market.yes_ask ? `@ $${market.yes_ask}` : 'Market Ask'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSideToggle('no')}
                  className={`py-3.5 rounded-xl text-sm font-black transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    side === 'no'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25 ring-2 ring-rose-400'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={`w-4 h-4 ${side === 'no' ? 'opacity-100' : 'opacity-0'}`} />
                    <span>OUTCOME: NO</span>
                  </div>
                  <span className="text-xs font-semibold opacity-90 font-mono">
                    {market.yes_bid ? `@ $${(1.0 - parseFloat(market.yes_bid)).toFixed(2)}` : 'Market Bid'}
                  </span>
                </button>
              </div>
            </div>

          {/* Amount to Bet ($) Section - Primary Control */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border-2 border-emerald-500/40 space-y-3 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                Actual Amount to Bet ($)
              </label>
              <span className="text-xs text-zinc-400 font-mono font-bold">
                {contracts} contracts @ ${price.toFixed(2)}
              </span>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-4 text-2xl font-black text-emerald-400 font-mono">$</span>
              <input
                type="number"
                step="any"
                min="0.01"
                value={dollarAmount}
                onChange={(e) => handleDollarChange(e.target.value)}
                placeholder={(contracts * price).toFixed(2)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 focus:border-emerald-400 rounded-xl text-2xl sm:text-3xl font-black font-mono text-white focus:outline-none transition shadow-inner"
              />
            </div>

            {/* Quick Dollar Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
              {[5, 10, 20, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleDollarChange(String(amt))}
                  className="px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-emerald-500/60 text-xs font-mono font-bold text-zinc-200 hover:text-white transition active:scale-95 cursor-pointer"
                >
                  ${amt}
                </button>
              ))}
              {parseFloat(String(availableCash || '0')) > 0 && (
                <button
                  type="button"
                  onClick={() => handleDollarChange(parseFloat(String(availableCash)).toFixed(2))}
                  className="px-3 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-mono font-bold text-emerald-400 transition active:scale-95 ml-auto cursor-pointer"
                  title={`Use full available cash balance ($${parseFloat(String(availableCash)).toFixed(2)})`}
                >
                  Max Cash (${parseFloat(String(availableCash)).toFixed(2)})
                </button>
              )}
            </div>
          </div>

          {/* Price & Contracts Steppers (Manual Fine-Tuning) */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Limit Price */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Limit Price ($)</label>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handlePriceChange(price - 0.01)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 active:scale-95 transition cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-center">
                  <span className="text-zinc-500 font-mono text-base mr-0.5">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max="0.99"
                    value={price.toFixed(2)}
                    onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0.01)}
                    className="w-16 text-center bg-transparent text-xl sm:text-2xl font-black font-mono text-white focus:outline-none focus:bg-zinc-900 rounded-lg py-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handlePriceChange(price + 0.01)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contracts Quantity */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Contracts (Count)</label>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleContractsChange(contracts - 1)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 active:scale-95 transition cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-center">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={contracts}
                    onChange={(e) => handleContractsChange(parseInt(e.target.value) || 1)}
                    className="w-16 text-center bg-transparent text-xl sm:text-2xl font-black font-mono text-emerald-400 focus:outline-none focus:bg-zinc-900 rounded-lg py-1"
                  />
                  <span className="text-sm text-zinc-500 font-mono -ml-1">x</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleContractsChange(contracts + 1)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 active:scale-95 transition cursor-pointer"
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
                onClick={() => handleContractsChange(qty)}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold font-mono transition cursor-pointer ${
                  contracts === qty
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {qty}x
              </button>
            ))}
          </div>

          {/* Financial Economics & Fee Breakdown */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 text-sm">
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-bold border-b border-zinc-800/80 pb-2 flex items-center justify-between">
              <span>Financial Economics</span>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">Kalshi Fee Formula Active</span>
            </div>

            <div className="flex justify-between text-zinc-300">
              <span>Gross Contracts Cost ({contracts}x @ ${price.toFixed(2)})</span>
              <span className="text-white font-mono font-bold">${grossCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-zinc-300">
              <span className="flex items-center gap-1.5">
                <span>Exchange Taker Fee</span>
                <span className="text-xs text-zinc-500 font-mono">(0.07 × C × P × [1-P])</span>
              </span>
              <span className="text-amber-400 font-mono font-bold">+${takerFee.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-white font-black text-base pt-2 border-t border-zinc-800">
              <span>Total Capital Committed</span>
              <span className="text-emerald-400 font-mono text-lg">${totalCost.toFixed(2)}</span>
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

          </div>

          {/* Sticky Action Footer - Always visible regardless of screen height */}
          <div className="p-4 sm:p-5 bg-[#0b1013] border-t border-zinc-800 shrink-0 shadow-2xl space-y-2">
            {isInsufficient && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
                <span>Exceeds cash balance (${availableCashNum.toFixed(2)} avail)</span>
                <button
                  type="button"
                  onClick={() => handleDollarChange(availableCashNum.toFixed(2))}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold underline cursor-pointer"
                >
                  Cap to Max Cash
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={isExecuting || isInsufficient}
              className={`w-full h-14 sm:h-16 px-6 rounded-2xl font-black text-base sm:text-lg shadow-xl transition flex items-center justify-center gap-3 active:scale-95 cursor-pointer ${
                isInsufficient
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                  : side === 'yes'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-rose-500/30'
              } disabled:opacity-50`}
            >
              {isExecuting ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Order to Kalshi...</span>
                </>
              ) : isInsufficient ? (
                <span>INSUFFICIENT BALANCE (${availableCashNum.toFixed(2)} AVAIL)</span>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  <span>CONFIRM & BUY {side.toUpperCase()} — ${totalCost.toFixed(2)}</span>
                </>
              )}
            </button>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono px-1">
              <span>{contracts} contracts @ ${price.toFixed(2)}</span>
              <span>Potential Return: +${netProfit.toFixed(2)} (+{netRoiPct.toFixed(0)}% ROI)</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
