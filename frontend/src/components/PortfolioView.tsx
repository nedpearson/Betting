import React from 'react';
import type { PortfolioSummary } from '../types';
import { Wallet, PieChart, ArrowUpRight, TrendingUp, AlertCircle } from 'lucide-react';

interface PortfolioViewProps {
  portfolio: PortfolioSummary | null;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ portfolio }) => {
  if (!portfolio) {
    return (
      <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-8 text-center font-mono text-zinc-500">
        Loading portfolio ledger...
      </div>
    );
  }

  const drawdownPct = parseFloat(portfolio.drawdown_pct) * 100;

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-4">
          <span className="text-[10px] text-zinc-500 uppercase block mb-1">Starting Bankroll</span>
          <span className="text-xl font-bold text-white">${portfolio.starting_bankroll}</span>
          <span className="text-[10px] text-zinc-500 block mt-1">Configured Base</span>
        </div>

        <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-4">
          <span className="text-[10px] text-zinc-500 uppercase block mb-1">Total Equity</span>
          <span className="text-xl font-bold text-emerald-400">
            ${parseFloat(portfolio.total_equity).toFixed(2)}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-1">Cash + Open Value</span>
        </div>

        <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-4">
          <span className="text-[10px] text-zinc-500 uppercase block mb-1">Total Fees Paid</span>
          <span className="text-xl font-bold text-zinc-300">
            ${parseFloat(portfolio.total_fees).toFixed(2)}
          </span>
          <span className="text-[10px] text-zinc-500 block mt-1">Quadratic Exchange Fees</span>
        </div>

        <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-4">
          <span className="text-[10px] text-zinc-500 uppercase block mb-1">Max Drawdown</span>
          <span
            className={`text-xl font-bold ${
              drawdownPct > 5.0 ? 'text-amber-400' : 'text-zinc-300'
            }`}
          >
            {drawdownPct.toFixed(1)}%
          </span>
          <span className="text-[10px] text-zinc-500 block mt-1">Hard Cutoff: 10.0%</span>
        </div>
      </div>

      {/* Open Positions Table */}
      <div className="bg-[#0e1417] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Active Market Positions
          </h3>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            {portfolio.positions.length} open
          </span>
        </div>

        {portfolio.positions.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-zinc-500">
            No active open positions. Capital is 100% preserved.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-zinc-900/60 text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Market</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4 text-right">Contracts</th>
                  <th className="py-3 px-4 text-right">Avg Entry</th>
                  <th className="py-3 px-4 text-right">Mid Price</th>
                  <th className="py-3 px-4 text-right">Cost Basis</th>
                  <th className="py-3 px-4 text-right">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {portfolio.positions.map((pos) => {
                  const unPnl = parseFloat(pos.unrealized_pnl);
                  return (
                    <tr key={pos.ticker} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3 px-4 font-semibold text-white">{pos.ticker}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.side === 'yes'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-indigo-500/20 text-indigo-400'
                          }`}
                        >
                          {pos.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-200">{pos.contracts}</td>
                      <td className="py-3 px-4 text-right text-zinc-300">${pos.avg_entry}</td>
                      <td className="py-3 px-4 text-right text-zinc-300">
                        {pos.current_mid ? `$${pos.current_mid}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-300">
                        ${parseFloat(pos.cost_basis).toFixed(2)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          unPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {unPnl >= 0 ? '+' : ''}${unPnl.toFixed(2)}
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
