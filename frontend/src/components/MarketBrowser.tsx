import React, { useState } from 'react';
import type { Market } from '../types';
import { 
  Search, 
  Filter, 
  Layers, 
  ArrowUpDown, 
  ChevronRight, 
  X, 
  LayoutGrid, 
  List, 
  TrendingUp, 
  Clock, 
  Activity,
  DollarSign
} from 'lucide-react';
import { fetchMarketDetail } from '../api';

import type { Market, Position } from '../types';

interface MarketBrowserProps {
  markets: Market[];
  initialCategory?: string;
  positions?: Position[];
  onExecuteTrade?: (ticker: string, side: 'yes' | 'no', contracts: number, price: number) => void;
  availableCash?: string | number;
}

export const MarketBrowser: React.FC<MarketBrowserProps> = ({ 
  markets,
  initialCategory = 'ALL',
  positions = [],
  onExecuteTrade,
  availableCash,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedMarketForDetail, setSelectedMarketForDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  React.useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  const categories = ['ALL', 'Climate and Weather', 'Crypto', 'Sports', 'Economics'];

  const matchCategory = (m: Market, cat: string) => {
    if (cat === 'ALL') return true;
    const lowerCat = cat.toLowerCase();
    const mCat = (m.category || '').toLowerCase();
    const mTicker = (m.ticker || '').toUpperCase();
    const mTitle = (m.title || '').toLowerCase();

    if (cat === 'Climate and Weather') {
      return (
        mCat.includes('weather') || 
        mCat.includes('climate') || 
        mTicker.startsWith('KXHIGH') || 
        mTicker.startsWith('KXLOW') || 
        mTicker.startsWith('KXRAIN') || 
        mTicker.startsWith('KXSNOW') || 
        mTitle.includes('temperature') || 
        mTitle.includes('weather')
      );
    }
    if (cat === 'Crypto') {
      return (
        mCat.includes('crypto') || 
        mTicker.startsWith('KXBTC') || 
        mTicker.startsWith('KXETH') || 
        mTicker.startsWith('KXSOL') || 
        mTicker.startsWith('KXXRP') || 
        mTicker.startsWith('KXDOGE') || 
        mTitle.includes('bitcoin') || 
        mTitle.includes('ethereum')
      );
    }
    if (cat === 'Sports') {
      return (
        mCat.includes('sports') || 
        mTicker.startsWith('KXNFL') || 
        mTicker.startsWith('KXNBA') || 
        mTicker.startsWith('KXMLB') || 
        mTicker.startsWith('KXNHL') || 
        mTicker.startsWith('KXNCAAF') || 
        mTicker.startsWith('KXWNBA') || 
        mTicker.startsWith('KXLIGA') ||
        mTitle.includes('nfl') || 
        mTitle.includes('nba')
      );
    }
    if (cat === 'Economics') {
      return (
        mCat.includes('econ') || 
        mTicker.startsWith('FED') || 
        mTicker.startsWith('CPI') || 
        mTicker.startsWith('INX') || 
        mTicker.startsWith('JOB') || 
        mTicker.startsWith('GDP') || 
        mTitle.includes('federal reserve') || 
        mTitle.includes('inflation')
      );
    }

    return mCat.includes(lowerCat);
  };

  const getCategoryCount = (cat: string) => {
    return markets.filter((m) => matchCategory(m, cat)).length;
  };

  const filtered = markets.filter((m) => {
    const matchesSearch =
      m.ticker.toLowerCase().includes(search.toLowerCase()) ||
      m.title.toLowerCase().includes(search.toLowerCase());
    const matchesCat = matchCategory(m, selectedCategory);
    return matchesSearch && matchesCat;
  });

  const handleSelectMarket = async (ticker: string) => {
    setIsLoadingDetail(true);
    try {
      const data = await fetchMarketDetail(ticker);
      setSelectedMarketForDetail(data);
    } catch {
      // ignore
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const getCategoryColor = (cat: string | null | undefined) => {
    const lower = (cat || '').toLowerCase();
    if (lower.includes('crypto')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (lower.includes('weather') || lower.includes('climate')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    if (lower.includes('sports')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (lower.includes('econ')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-[#0c1114] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Box (Big & Clear) */}
          <div className="flex items-center gap-3 flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 sm:py-3.5 focus-within:border-emerald-500/50 transition">
            <Search className="h-5 w-5 text-emerald-400 shrink-0" />
            <input
              type="text"
              placeholder="Search markets by title, team, city, or ticker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none w-full font-medium"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle (Cards vs Table) */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-xs sm:text-sm font-semibold text-zinc-400">
              {filtered.length} Markets
            </span>
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-1 gap-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  viewMode === 'cards'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Card View (Optimized for browsing)"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  viewMode === 'table'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Table View (Desktop Terminal)"
              >
                <List className="w-4 h-4" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const count = getCategoryCount(cat);
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm whitespace-nowrap transition font-bold flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-zinc-950 font-black shadow-md'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-zinc-950/20 text-zinc-950 font-black' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards View (Bigger & High Contrast) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((m) => {
            const yesPrice = m.yes_ask ? parseFloat(m.yes_ask) : (m.yes_bid ? parseFloat(m.yes_bid) : 0.50);
            const noPrice = parseFloat((1.0 - yesPrice).toFixed(2));

            return (
              <div
                key={m.ticker}
                className="bg-[#0c1114] border border-zinc-800 hover:border-zinc-700 rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl transition flex flex-col justify-between space-y-4 group"
              >
                {/* Card Top: Badges & Ticker */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${getCategoryColor(
                          m.category
                        )}`}
                      >
                        {m.category || 'General'}
                      </span>
                      {(() => {
                        const h = positions?.find(p => p.ticker === m.ticker);
                        if (!h) return null;
                        return (
                          <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                            OWNED: {h.contracts}x {h.side.toUpperCase()}
                          </span>
                        );
                      })()}
                    </div>
                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      {m.close_time ? new Date(m.close_time).toLocaleDateString() : 'Live'}
                    </span>
                  </div>

                  {/* Market Title */}
                  <h4 
                    onClick={() => handleSelectMarket(m.ticker)}
                    className="text-base sm:text-lg font-black text-white leading-snug group-hover:text-emerald-300 transition cursor-pointer line-clamp-2"
                  >
                    {m.title}
                  </h4>

                  <div className="text-xs font-mono text-zinc-400 flex items-center justify-between">
                    <span className="truncate font-semibold">{m.ticker}</span>
                    {m.spread && (
                      <span className="text-zinc-300 font-bold">Spread: ${m.spread}</span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Big Actionable YES / NO Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      const p = m.yes_ask ? parseFloat(m.yes_ask) : 0.50;
                      onExecuteTrade?.(m.ticker, 'yes', 10, p);
                    }}
                    className="py-3 px-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border-2 border-emerald-500/40 text-emerald-300 font-mono transition flex flex-col items-center justify-center active:scale-95 shadow-sm group-hover:border-emerald-500 cursor-pointer"
                  >
                    <span className="text-xs font-black uppercase text-emerald-400">BUY YES</span>
                    <span className="text-base sm:text-lg font-black text-white mt-0.5">
                      {m.yes_ask ? `$${m.yes_ask}` : `${Math.round(yesPrice * 100)}¢`}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      const p = m.yes_bid ? parseFloat((1.0 - parseFloat(m.yes_bid)).toFixed(2)) : 0.50;
                      onExecuteTrade?.(m.ticker, 'no', 10, p);
                    }}
                    className="py-3 px-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border-2 border-rose-500/40 text-rose-300 font-mono transition flex flex-col items-center justify-center active:scale-95 shadow-sm group-hover:border-rose-500 cursor-pointer"
                  >
                    <span className="text-xs font-black uppercase text-rose-400">BUY NO</span>
                    <span className="text-base sm:text-lg font-black text-white mt-0.5">
                      {m.yes_bid ? `$${(1.0 - parseFloat(m.yes_bid)).toFixed(2)}` : `${Math.round(noPrice * 100)}¢`}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500 font-mono text-xs bg-[#0c1114] border border-zinc-800 rounded-2xl p-8">
              No live markets matching filter criteria.
            </div>
          )}
        </div>
      )}

      {/* Table View (Desktop Traditional) */}
      {viewMode === 'table' && (
        <div className="bg-[#0c1114] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-zinc-400 uppercase text-[10px]">
                  <th className="py-3 px-4 font-semibold">Ticker</th>
                  <th className="py-3 px-4 font-semibold">Market Title</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">YES Bid</th>
                  <th className="py-3 px-4 font-semibold">YES Ask</th>
                  <th className="py-3 px-4 font-semibold">Spread</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((m) => (
                  <tr
                    key={m.ticker}
                    className="hover:bg-zinc-800/30 transition group"
                  >
                    <td className="py-3 px-4 font-semibold text-emerald-400">
                      {m.ticker}
                    </td>
                    <td 
                      onClick={() => handleSelectMarket(m.ticker)}
                      className="py-3 px-4 text-zinc-200 font-sans cursor-pointer group-hover:text-emerald-300 transition"
                    >
                      {m.title}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getCategoryColor(m.category)}`}>
                        {m.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {m.yes_bid ? `$${m.yes_bid}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {m.yes_ask ? `$${m.yes_ask}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {m.spread ? `$${m.spread}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          const p = m.yes_ask ? parseFloat(m.yes_ask) : 0.50;
                          onExecuteTrade?.(m.ticker, 'yes', 10, p);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold transition cursor-pointer"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Institutional Market Drill-Down Modal */}
      {selectedMarketForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0b1013] border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                    {selectedMarketForDetail.category || 'General'}
                  </span>
                  <span className="text-xs font-mono text-zinc-500">•</span>
                  <span className="text-xs font-mono text-zinc-400 font-bold">
                    {selectedMarketForDetail.ticker}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
                  {selectedMarketForDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMarketForDetail(null)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Position Banner in Modal */}
            {(() => {
              const h = positions?.find(p => p.ticker === selectedMarketForDetail.ticker);
              if (!h) return null;
              return (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span><strong>YOU HOLD {h.contracts} CONTRACTS ({h.side.toUpperCase()})</strong> @ {h.avg_entry_cents || '$' + h.avg_entry}</span>
                  </div>
                  <span>Cost Basis: ${h.cost_basis}</span>
                </div>
              );
            })()}

            {/* Market Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 uppercase block text-[10px]">24h Volume</span>
                <span className="text-base font-bold text-white mt-0.5 block">
                  {parseFloat(selectedMarketForDetail.volume_24h || '0').toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500">Contracts traded</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 uppercase block text-[10px]">Open Interest</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                  {parseFloat(selectedMarketForDetail.open_interest || '0').toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500">Active exposure</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 uppercase block text-[10px]">Current Spread</span>
                <span className="text-base font-bold text-sky-400 mt-0.5 block">
                  {selectedMarketForDetail.yes_bid && selectedMarketForDetail.yes_ask
                    ? `$${(parseFloat(selectedMarketForDetail.yes_ask) - parseFloat(selectedMarketForDetail.yes_bid)).toFixed(2)}`
                    : '1.0¢'}
                </span>
                <span className="text-[10px] text-zinc-500">Bid / Ask delta</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 uppercase block text-[10px]">Close / Expiry</span>
                <span className="text-xs font-bold text-zinc-300 mt-0.5 block truncate">
                  {selectedMarketForDetail.close_time 
                    ? new Date(selectedMarketForDetail.close_time).toLocaleDateString()
                    : 'Active'}
                </span>
                <span className="text-[10px] text-zinc-500">Settlement window</span>
              </div>
            </div>

            {/* Level-2 Order Book Resting Depth */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono font-semibold text-zinc-400 uppercase">
                <span>Live Level-2 Order Book Depth</span>
                <span className="text-[11px] text-emerald-400">Kalshi Order Matching Shard</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {/* YES BIDS */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex justify-between text-emerald-400 font-bold border-b border-zinc-800/80 pb-1.5">
                    <span>YES BID PRICE</span>
                    <span>SIZE</span>
                  </div>
                  {selectedMarketForDetail.orderbook?.yes_bids?.length > 0 ? (
                    selectedMarketForDetail.orderbook.yes_bids.slice(0, 6).map(([p, q]: any, idx: number) => {
                      const priceVal = parseFloat(p);
                      const displayPrice = priceVal < 1 ? `$${priceVal.toFixed(2)}` : `$${(priceVal / 100).toFixed(2)}`;
                      return (
                        <div key={idx} className="flex justify-between py-1 text-zinc-300 hover:bg-zinc-900/60 px-1 rounded">
                          <span className="font-bold text-emerald-400">{displayPrice}</span>
                          <span className="text-zinc-400 font-semibold">{parseFloat(q).toLocaleString()}x</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-zinc-600 py-3 text-center">No resting bids in book</div>
                  )}
                </div>

                {/* YES ASKS */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex justify-between text-rose-400 font-bold border-b border-zinc-800/80 pb-1.5">
                    <span>YES ASK PRICE</span>
                    <span>SIZE</span>
                  </div>
                  {selectedMarketForDetail.orderbook?.yes_asks?.length > 0 ? (
                    selectedMarketForDetail.orderbook.yes_asks.slice(0, 6).map(([p, q]: any, idx: number) => {
                      const priceVal = parseFloat(p);
                      const displayPrice = priceVal < 1 ? `$${priceVal.toFixed(2)}` : `$${(priceVal / 100).toFixed(2)}`;
                      return (
                        <div key={idx} className="flex justify-between py-1 text-zinc-300 hover:bg-zinc-900/60 px-1 rounded">
                          <span className="font-bold text-rose-400">{displayPrice}</span>
                          <span className="text-zinc-400 font-semibold">{parseFloat(q).toLocaleString()}x</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-zinc-600 py-3 text-center">No resting asks in book</div>
                  )}
                </div>
              </div>
            </div>

            {/* Official Settlement Rules & Legal Protocol */}
            {selectedMarketForDetail.rules_primary && (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5 font-sans">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block font-mono">
                  Official Kalshi Settlement Protocol
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selectedMarketForDetail.rules_primary}
                </p>
                {selectedMarketForDetail.rules_secondary && (
                  <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">
                    {selectedMarketForDetail.rules_secondary}
                  </p>
                )}
              </div>
            )}

            {/* Embedded Order Placement Controls */}
            <div className="pt-2 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const m = markets.find(x => x.ticker === selectedMarketForDetail.ticker) || selectedMarketForDetail;
                  const p = m.yes_ask ? parseFloat(m.yes_ask) : 0.50;
                  onExecuteTrade?.(m.ticker, 'yes', 10, p);
                  setSelectedMarketForDetail(null);
                }}
                className="py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black font-mono text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
              >
                <span>BUY YES @ ${selectedMarketForDetail.yes_ask || '0.50'}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const m = markets.find(x => x.ticker === selectedMarketForDetail.ticker) || selectedMarketForDetail;
                  const p = m.yes_bid ? parseFloat((1.0 - parseFloat(m.yes_bid)).toFixed(2)) : 0.50;
                  onExecuteTrade?.(m.ticker, 'no', 10, p);
                  setSelectedMarketForDetail(null);
                }}
                className="py-3.5 px-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black font-mono text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer"
              >
                <span>BUY NO @ ${(1.0 - parseFloat(selectedMarketForDetail.yes_bid || '0.50')).toFixed(2)}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
