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
import { TradeDrawer } from './TradeDrawer';

interface MarketBrowserProps {
  markets: Market[];
  onExecuteTrade?: (ticker: string, side: 'yes' | 'no', contracts: number, price: number) => void;
}

export const MarketBrowser: React.FC<MarketBrowserProps> = ({ 
  markets,
  onExecuteTrade,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedMarketForDetail, setSelectedMarketForDetail] = useState<any | null>(null);
  const [tradeDrawerMarket, setTradeDrawerMarket] = useState<Market | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const categories = ['ALL', 'Climate and Weather', 'Crypto', 'Sports', 'Economics'];

  const filtered = markets.filter((m) => {
    const matchesSearch =
      m.ticker.toLowerCase().includes(search.toLowerCase()) ||
      m.title.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      selectedCategory === 'ALL' ||
      (m.category && m.category.toLowerCase().includes(selectedCategory.toLowerCase()));
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
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="bg-[#0c1114] border border-zinc-800/80 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex items-center gap-2.5 flex-1 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-3.5 py-2.5">
            <Search className="h-4 w-4 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Search markets by title, ticker, or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full font-mono"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-zinc-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle (Cards vs Table) */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] font-mono text-zinc-400 sm:hidden">
              {filtered.length} markets
            </span>
            <div className="flex items-center bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 ${
                  viewMode === 'cards'
                    ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Card View (Mobile Optimized)"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Table View (Desktop Terminal)"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px]">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                  : 'bg-zinc-950/60 border border-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cards View (Mobile-First) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((m) => {
            const yesPrice = m.yes_ask ? parseFloat(m.yes_ask) : (m.yes_bid ? parseFloat(m.yes_bid) : 0.50);
            const noPrice = parseFloat((1.0 - yesPrice).toFixed(2));

            return (
              <div
                key={m.ticker}
                className="bg-[#0c1114] border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-3 group"
              >
                {/* Card Top: Badges & Ticker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getCategoryColor(
                        m.category
                      )}`}
                    >
                      {m.category || 'General'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {m.close_time ? new Date(m.close_time).toLocaleDateString() : 'Live'}
                    </span>
                  </div>

                  {/* Market Title */}
                  <h4 
                    onClick={() => handleSelectMarket(m.ticker)}
                    className="text-sm font-bold text-white leading-snug group-hover:text-emerald-300 transition cursor-pointer line-clamp-2"
                  >
                    {m.title}
                  </h4>

                  <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                    <span className="truncate">{m.ticker}</span>
                    {m.spread && (
                      <span className="text-zinc-400">Spread: ${m.spread}</span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Big Actionable YES / NO Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60">
                  <button
                    onClick={() => setTradeDrawerMarket(m)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono transition flex flex-col items-center justify-center active:scale-95"
                  >
                    <span className="text-[10px] font-medium opacity-80 uppercase">BUY YES</span>
                    <span className="text-sm font-bold mt-0.5">
                      {m.yes_ask ? `$${m.yes_ask}` : `${Math.round(yesPrice * 100)}¢`}
                    </span>
                  </button>

                  <button
                    onClick={() => setTradeDrawerMarket(m)}
                    className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono transition flex flex-col items-center justify-center active:scale-95"
                  >
                    <span className="text-[10px] font-medium opacity-80 uppercase">BUY NO</span>
                    <span className="text-sm font-bold mt-0.5">
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
                        onClick={() => setTradeDrawerMarket(m)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold transition"
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

      {/* Trade Bottom Sheet Drawer */}
      <TradeDrawer
        market={tradeDrawerMarket}
        isOpen={Boolean(tradeDrawerMarket)}
        onClose={() => setTradeDrawerMarket(null)}
        onExecute={(t, s, c, p) => {
          if (onExecuteTrade) onExecuteTrade(t, s, c, p);
          setTradeDrawerMarket(null);
        }}
      />

      {/* Market Order Book Detail Modal */}
      {selectedMarketForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {selectedMarketForDetail.category || 'General'}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedMarketForDetail.title}
                </h3>
                <div className="text-xs font-mono text-zinc-400">
                  {selectedMarketForDetail.ticker}
                </div>
              </div>
              <button
                onClick={() => setSelectedMarketForDetail(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resting Depth */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-semibold text-zinc-400 uppercase">
                Resting Order Book Depth
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-emerald-400 font-bold mb-1">YES BIDS</div>
                  {selectedMarketForDetail.orderbook?.yes_bids?.length > 0 ? (
                    selectedMarketForDetail.orderbook.yes_bids.slice(0, 5).map(([p, q]: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-0.5 text-zinc-300">
                        <span>${p}</span>
                        <span className="text-zinc-500">{q}x</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-600">No resting bids</div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-rose-400 font-bold mb-1">DERIVED YES ASKS</div>
                  {selectedMarketForDetail.orderbook?.yes_asks?.length > 0 ? (
                    selectedMarketForDetail.orderbook.yes_asks.slice(0, 5).map(([p, q]: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-0.5 text-zinc-300">
                        <span>${p}</span>
                        <span className="text-zinc-500">{q}x</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-600">No resting asks</div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  const m = markets.find(x => x.ticker === selectedMarketForDetail.ticker);
                  if (m) setTradeDrawerMarket(m);
                  setSelectedMarketForDetail(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 text-zinc-950 font-bold font-mono text-xs hover:bg-emerald-400 transition"
              >
                Open Order Execution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
