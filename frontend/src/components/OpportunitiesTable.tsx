import React from 'react';
import type { Opportunity } from '../types';
import { ArrowUpRight, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  onSelect: (opp: Opportunity) => void;
}

export const OpportunitiesTable: React.FC<OpportunitiesTableProps> = ({
  opportunities,
  onSelect,
}) => {
  if (opportunities.length === 0) {
    return (
      <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-400 text-sm">
          No secondary candidate opportunities currently pass conservative thresholds.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0e1417] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Candidate Leaderboard
          </h3>
          <p className="text-xs text-zinc-500 font-mono">
            Ranked strictly by conservative risk-adjusted return (Net ROI on deployed capital)
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
          {opportunities.length} candidates
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-zinc-900/60 text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Market / Contract</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Entry</th>
              <th className="py-3 px-4 text-right">Max Entry</th>
              <th className="py-3 px-4 text-right">Cons Prob</th>
              <th className="py-3 px-4 text-right">Net ROI</th>
              <th className="py-3 px-4 text-right">Stake</th>
              <th className="py-3 px-4 text-center">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {opportunities.map((opp, idx) => {
              const isYes = opp.action === 'BUY_YES';
              return (
                <tr
                  key={opp.ticker + idx}
                  className="hover:bg-zinc-900/40 transition group cursor-pointer"
                  onClick={() => onSelect(opp)}
                >
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                        isYes
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      }`}
                    >
                      {opp.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">
                    {opp.ticker}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        opp.category === 'STRONG_CANDIDATE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {opp.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-200">
                    ${opp.entry_price}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-400">
                    ${opp.max_entry_price}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-300">
                    {(parseFloat(opp.conservative_probability) * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400">
                    +{(parseFloat(opp.net_roi) * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-200">
                    ${opp.recommended_stake}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button className="p-1 rounded bg-zinc-800 group-hover:bg-zinc-700 text-zinc-400 group-hover:text-white transition">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
