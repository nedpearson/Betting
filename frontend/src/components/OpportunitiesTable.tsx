import React from 'react';
import type { Opportunity } from '../types';
import { ArrowUpRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  selectedTicker?: string;
  onSelect: (opp: Opportunity) => void;
  onViewThesis?: (opp: Opportunity) => void;
}

export const OpportunitiesTable: React.FC<OpportunitiesTableProps> = ({
  opportunities,
  selectedTicker,
  onSelect,
  onViewThesis,
}) => {
  if (opportunities.length === 0) {
    return (
      <div className="bg-[#0e1417] border border-zinc-800 rounded-2xl p-8 text-center">
        <p className="text-zinc-400 text-sm">
          No secondary candidate opportunities currently pass conservative thresholds.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0e1417] border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <span>Ranked Candidate Leaderboard</span>
            <span className="text-xs text-emerald-400 font-normal">({opportunities.length} Total Opportunities)</span>
          </h3>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Ranked strictly by conservative risk-adjusted return (Net ROI on deployed capital). Click any row to load its AI Research Thesis.
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-300 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
          {opportunities.length} candidates
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4">Rank / Action</th>
              <th className="py-3 px-4">Market / Contract</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Entry</th>
              <th className="py-3 px-4 text-right">Model Fair</th>
              <th className="py-3 px-4 text-right">Net Edge</th>
              <th className="py-3 px-4 text-right">Net ROI</th>
              <th className="py-3 px-4 text-right">Kelly Stake</th>
              <th className="py-3 px-4 text-center">AI Thesis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {opportunities.map((opp, idx) => {
              const item = (opp as any).payload || opp;
              const isYes = (item.action || opp.action) === 'BUY_YES';
              const ticker = item.ticker || opp.ticker;
              const isSelected = selectedTicker === ticker;
              const category = item.category || opp.category || 'CANDIDATE';
              const entry = item.entry_price || '0.00';
              
              const rawProb = String(item.conservative_probability || item.estimated_probability || '0');
              const probNum = parseFloat(rawProb.replace('%', '')) || 0;
              const probDisplay = rawProb.includes('%') ? rawProb : `${(probNum <= 1 ? probNum * 100 : probNum).toFixed(1)}%`;

              const rawRoi = String(item.net_roi || '0');
              let roiDisplay = '+0.0%';
              if (rawRoi.includes('%')) {
                roiDisplay = rawRoi.startsWith('+') ? rawRoi : `+${rawRoi}`;
              } else {
                const roiNum = parseFloat(rawRoi) || 0;
                roiDisplay = `+${(roiNum < 2 ? roiNum * 100 : roiNum).toFixed(1)}%`;
              }

              const edgeStr = item.conservative_edge ? `+$${parseFloat(item.conservative_edge).toFixed(3)}` : '+$0.00';
              const stake = item.recommended_stake || (parseFloat(entry) * (parseInt(item.recommended_contracts) || 1)).toFixed(2);

              return (
                <tr
                  key={ticker + idx}
                  className={`transition group cursor-pointer ${
                    isSelected 
                      ? 'bg-emerald-500/10 border-l-4 border-l-emerald-400 hover:bg-emerald-500/15' 
                      : 'hover:bg-zinc-900/60'
                  }`}
                  onClick={() => {
                    if (onViewThesis) onViewThesis(item);
                    else onSelect(item);
                  }}
                  title="Click to view full AI Thesis & trade details"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500 font-bold">#{idx + 1}</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                          isYes
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.action || opp.action}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">
                    <div className="flex items-center gap-1.5">
                      <span>{ticker}</span>
                      {isSelected && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-400 text-zinc-950 font-black">
                          ACTIVE THESIS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        category === 'STRONG_CANDIDATE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-200">
                    ${entry}
                  </td>
                  <td className="py-3 px-4 text-right text-sky-400 font-semibold">
                    {probDisplay}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-semibold">
                    {edgeStr}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-400 text-sm">
                    {roiDisplay}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-200">
                    ${stake}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(item);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-300 transition text-[11px] font-bold flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <span>Trade</span>
                      <ArrowUpRight className="h-3 w-3" />
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
