import React, { useState } from 'react';
import type { Market, Opportunity } from '../types';
import { Star, ArrowUpRight, TrendingUp, Layers, Search, Sparkles, AlertCircle } from 'lucide-react';

interface WatchlistViewProps {
  watchlist: string[];
  markets: Market[];
  opportunities: Opportunity[];
  onToggleWatchlist: (ticker: string) => void;
  onTrade: (ticker: string, side: 'yes' | 'no', contracts: number, price: number) => void;
  onSelectMarket: (market: Market) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlist,
  markets,
  opportunities,
  onToggleWatchlist,
  onTrade,
  onSelectMarket,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Map watched tickers to their market objects
  const watchedMarkets = watchlist.map((ticker) => {
    const m = markets.find((item) => item.ticker === ticker);
    const opp = opportunities.find((o) => o.ticker === ticker);
    return {
      ticker,
      market: m,
      opportunity: opp,
    };
  });

  const filtered = watchedMarkets.filter((item) => {
    const q = filterQuery.toLowerCase();
    const title = item.market?.title || item.ticker;
    return item.ticker.toLowerCase().includes(q) || title.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1417] border border-zinc-800 p-4 sm:p-5 rounded-2xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider font-mono flex items-center gap-2.5">
            <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
            Personal Market Watchlist
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-mono mt-0.5">
            Monitored contracts with live prices, spread tightness, and mathematical edge
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            {watchlist.length} Monitored
          </span>
        </div>
      </div>

      {/* Search Filter */}
      {watchlist.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter watchlist by city, strike, or ticker..."
            className="w-full bg-[#0b1013] border border-zinc-800 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 font-mono outline-none transition"
          />
        </div>
      )}

      {/* Empty State */}
      {watchlist.length === 0 ? (
        <div className="bg-[#0e1417] border border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Star className="w-7 h-7 fill-amber-400/20" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white font-mono">Your Watchlist is Empty</h3>
            <p className="text-sm text-zinc-400">
              Tap the star icon on any market card or top trade opportunity to monitor price movements and live edge directly from this screen.
            </p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0e1417] border border-zinc-800 rounded-2xl p-6 text-center text-sm font-mono text-zinc-400">
          No watchlisted markets match your search &quot;{filterQuery}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(({ ticker, market, opportunity }) => {
            const title = market?.title || ticker;
            const yesBid = market?.yes_bid ? parseFloat(market.yes_bid) : null;
            const yesAsk = market?.yes_ask ? parseFloat(market.yes_ask) : null;
            const spread = market?.spread ? parseFloat(market.spread) : null;
            const category = market?.category || 'General';

            return (
              <div
                key={ticker}
                className="bg-[#0e1417] border border-zinc-800 hover:border-amber-400/50 rounded-2xl p-4 sm:p-5 transition flex flex-col justify-between space-y-4 shadow-md group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                        {category}
                      </span>
                      <span className="text-xs font-mono text-zinc-400 font-bold truncate max-w-[150px]">
                        {ticker}
                      </span>
                    </div>

                    <button
                      onClick={() => onToggleWatchlist(ticker)}
                      className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-rose-500/20 hover:text-rose-400 transition cursor-pointer"
                      title="Remove from watchlist"
                    >
                      <Star className="w-4 h-4 fill-amber-400" />
                    </button>
                  </div>

                  <h3
                    onClick={() => market && onSelectMarket(market)}
                    className="text-base font-bold text-white group-hover:text-amber-300 transition line-clamp-2 cursor-pointer mb-3"
                  >
                    {title}
                  </h3>

                  {opportunity && (
                    <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2.5 mb-3 flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        AI Recommends {opportunity.action}
                      </span>
                      <span className="text-emerald-400 font-bold">{opportunity.net_roi} ROI</span>
                    </div>
                  )}

                  {/* Market Pricing Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80 font-mono text-xs">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Bid</span>
                      <span className="text-white font-bold">
                        {yesBid !== null ? `${(yesBid * 100).toFixed(0)}¢` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Ask</span>
                      <span className="text-white font-bold">
                        {yesAsk !== null ? `${(yesAsk * 100).toFixed(0)}¢` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Spread</span>
                      <span className="text-emerald-400 font-bold">
                        {spread !== null ? `${(spread * 100).toFixed(1)}¢` : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                  <button
                    onClick={() => market && onSelectMarket(market)}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono font-bold border border-zinc-750 transition active:scale-95 cursor-pointer text-center"
                  >
                    L2 Depth &amp; Rules
                  </button>

                  <button
                    onClick={() => onTrade(ticker, 'yes', 10, yesAsk || 0.50)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-black transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>Trade</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
