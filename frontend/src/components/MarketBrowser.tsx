import React, { useState } from 'react';
import type { Market } from '../types';
import { Search, Filter, Layers, ArrowUpDown, ChevronRight, X } from 'lucide-react';
import { fetchMarketDetail } from '../api';

interface MarketBrowserProps {
  markets: Market[];
}

export const MarketBrowser: React.FC<MarketBrowserProps> = ({ markets }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMarket, setSelectedMarket] = useState<any | null>(null);
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
      setSelectedMarket(data);
    } catch {
      // ignore
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="bg-[#0e1417] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      {/* Search and Filters */}
      <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[260px] bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search markets by ticker or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition ${
                selectedCategory === cat
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Markets Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-zinc-900/60 text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4">Ticker</th>
              <th className="py-3 px-4">Market Title</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Yes Bid</th>
              <th className="py-3 px-4 text-right">Yes Ask</th>
              <th className="py-3 px-4 text-right">Spread</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Order Book</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filtered.slice(0, 100).map((m) => (
              <tr
                key={m.ticker}
                className="hover:bg-zinc-900/40 transition cursor-pointer"
                onClick={() => handleSelectMarket(m.ticker)}
              >
                <td className="py-3 px-4 font-semibold text-emerald-400">
                  {m.ticker}
                </td>
                <td className="py-3 px-4 text-zinc-200 max-w-md truncate">
                  {m.title}
                </td>
                <td className="py-3 px-4 text-zinc-400">
                  {m.category || 'General'}
                </td>
                <td className="py-3 px-4 text-right text-zinc-200">
                  {m.yes_bid ? `$${m.yes_bid}` : '—'}
                </td>
                <td className="py-3 px-4 text-right text-zinc-200">
                  {m.yes_ask ? `$${m.yes_ask}` : '—'}
                </td>
                <td className="py-3 px-4 text-right text-zinc-400">
                  {m.spread ? `$${m.spread}` : '—'}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      m.is_stale ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                    }`}
                  >
                    {m.is_stale ? 'STALE' : 'LIVE'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white inline-block">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drilldown Drawer / Modal */}
      {selectedMarket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e1417] border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="font-mono text-xs text-emerald-400 font-semibold">
                  {selectedMarket.ticker}
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {selectedMarket.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMarket(null)}
                className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Depth Ladder */}
            <div className="grid grid-cols-2 gap-4 mb-6 font-mono text-xs">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
                <span className="text-[10px] text-emerald-400 uppercase font-bold block mb-2">
                  Executable YES Bids (Top Depth)
                </span>
                <div className="space-y-1">
                  {selectedMarket.orderbook?.yes_bids?.map(([p, q]: any, i: number) => (
                    <div key={i} className="flex justify-between text-zinc-300">
                      <span>${p}</span>
                      <span className="text-zinc-500">{q} contracts</span>
                    </div>
                  )) || <p className="text-zinc-600">No resting bids</p>}
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
                <span className="text-[10px] text-indigo-400 uppercase font-bold block mb-2">
                  Executable YES Asks (Top Depth)
                </span>
                <div className="space-y-1">
                  {selectedMarket.orderbook?.yes_asks?.map(([p, q]: any, i: number) => (
                    <div key={i} className="flex justify-between text-zinc-300">
                      <span>${p}</span>
                      <span className="text-zinc-500">{q} contracts</span>
                    </div>
                  )) || <p className="text-zinc-600">No resting asks</p>}
                </div>
              </div>
            </div>

            {/* Quantitative Model Forecast */}
            {selectedMarket.forecast ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3.5 text-xs font-mono">
                <span className="text-emerald-400 font-bold block mb-1">
                  QUANTITATIVE MODEL FORECAST ({selectedMarket.forecast.model})
                </span>
                <div className="grid grid-cols-3 gap-2 text-zinc-300">
                  <div>Point P(YES): {(selectedMarket.forecast.p_yes * 100).toFixed(1)}%</div>
                  <div>Conservative P_low: {(selectedMarket.forecast.p_low * 100).toFixed(1)}%</div>
                  <div>P_high: {(selectedMarket.forecast.p_high * 100).toFixed(1)}%</div>
                </div>
              </div>
            ) : (
              <p className="text-xs font-mono text-zinc-500">
                No active forecast generated yet for this market.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
