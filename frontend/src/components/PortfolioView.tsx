import React from 'react';
import type { PortfolioSummary } from '../types';
import { 
  Wallet, 
  ShieldCheck, 
  ArrowUpRight, 
  TrendingUp, 
  DollarSign, 
  RefreshCw, 
  Layers, 
  AlertTriangle,
  ExternalLink,
  Clock
} from 'lucide-react';

interface PortfolioViewProps {
  portfolio: PortfolioSummary | null;
  onRefresh?: () => void;
  onOpenSettings?: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ 
  portfolio, 
  onRefresh,
  onOpenSettings,
}) => {
  if (!portfolio) {
    return (
      <div className="bg-[#0e1417] border border-zinc-800 rounded-2xl p-8 text-center font-mono text-zinc-500">
        Loading verified portfolio ledger...
      </div>
    );
  }

  const drawdownPct = parseFloat(portfolio.drawdown_pct || '0') * 100;
  const cashNum = parseFloat(portfolio.available_cash || '0');
  const equityNum = parseFloat(portfolio.total_equity || '0');
  const feesNum = parseFloat(portfolio.total_fees || '0');

  return (
    <div className="space-y-6">
      {/* Account Verification & Shard Status Header */}
      <div className="bg-[#0c1114] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              KALSHI EXCHANGE LINKED (SHARD 0 ACTIVE)
            </span>
            <span className="text-xs font-mono text-zinc-500">•</span>
            <span className="text-xs font-mono text-zinc-400 font-semibold">Live Clearing Partition</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Institutional Portfolio Ledger & Capital Allocation
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-mono text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Refresh ledger straight from Kalshi"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Cash</span>
            </button>
          )}

          <a
            href="https://kalshi.com/portfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-black transition flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <span>Kalshi Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Top Financial Economics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-zinc-400 uppercase font-bold block mb-1">Available Cash</span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            ${cashNum.toFixed(2)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Live Trading Liquidity</span>
        </div>

        <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-zinc-400 uppercase font-bold block mb-1">Total Account Equity</span>
          <span className="text-2xl sm:text-3xl font-black text-white font-mono">
            ${equityNum.toFixed(2)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Cash + Active Exposure</span>
        </div>

        <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-zinc-400 uppercase font-bold block mb-1">Total Exchange Fees</span>
          <span className="text-2xl sm:text-3xl font-black text-zinc-300 font-mono">
            ${feesNum.toFixed(2)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Quadratic Taker Fees</span>
        </div>

        <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-zinc-400 uppercase font-bold block mb-1">Max Drawdown</span>
          <span className={`text-2xl sm:text-3xl font-black font-mono ${drawdownPct > 5.0 ? 'text-amber-400' : 'text-zinc-300'}`}>
            {drawdownPct.toFixed(1)}%
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Hard Cutoff: 10.0%</span>
        </div>
      </div>

      {/* Open Positions Table */}
      <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Active Market Positions & Contracts
            </h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Live contracts held on Kalshi exchange ledger with mark-to-market valuations
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
            {portfolio.positions?.length || 0} open
          </span>
        </div>

        {(!portfolio.positions || portfolio.positions.length === 0) ? (
          <div className="p-10 text-center text-xs font-mono text-zinc-400 space-y-2">
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="font-bold text-zinc-300 text-sm">No active open contracts currently resting</p>
            <p className="text-zinc-500">100% of cash capital (${cashNum.toFixed(2)}) is preserved and available for high-conviction trades.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Market</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4 text-right">Contracts</th>
                  <th className="py-3 px-4 text-right">Avg Entry</th>
                  <th className="py-3 px-4 text-right">Cost Basis</th>
                  <th className="py-3 px-4 text-right">Fees Paid</th>
                  <th className="py-3 px-4 text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {portfolio.positions.map((pos) => {
                  return (
                    <tr key={pos.ticker} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3 px-4 font-semibold text-white">{pos.ticker}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pos.side === 'yes'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {pos.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white font-bold">{pos.contracts}x</td>
                      <td className="py-3 px-4 text-right text-zinc-300">${pos.avg_entry}</td>
                      <td className="py-3 px-4 text-right text-zinc-300">${pos.cost_basis}</td>
                      <td className="py-3 px-4 text-right text-amber-400">${pos.fees_paid}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                        {pos.unrealized_pnl ? `$${pos.unrealized_pnl}` : '$0.00'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
