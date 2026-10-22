import React, { useState } from 'react';
import type { AgentSnapshot } from '../types';
import { Bot, CheckCircle2, AlertOctagon, Terminal, Activity } from 'lucide-react';

interface AgentCommandCenterProps {
  agents: AgentSnapshot[];
}

export const AgentCommandCenter: React.FC<AgentCommandCenterProps> = ({ agents }) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentSnapshot | null>(null);

  const activeCount = agents.filter((a) => a.status === 'ACTIVE').length;
  const readyCount = agents.filter((a) => a.status.includes('STANDBY') || a.status.includes('READY') || a.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0e1417] border border-zinc-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider font-mono flex items-center gap-3">
            <Bot className="h-6 w-6 text-emerald-400" />
            Specialized Multi-Agent Command Center
          </h2>
          <p className="text-sm text-zinc-400 font-mono mt-1">
            16 specialized quantitative agents operating with zero synthetic data and verifiable telemetry
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm md:text-base font-mono font-bold px-4 py-2 rounded-xl border flex items-center gap-2 ${
            activeCount > 0
              ? 'text-emerald-300 bg-emerald-950/80 border-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'text-cyan-300 bg-cyan-950/80 border-cyan-700'
          }`}>
            <span className={`h-3 w-3 rounded-full ${activeCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
            {activeCount > 0
              ? `${activeCount} / ${agents.length} AGENTS ACTIVE (24/7 LOOP)`
              : `${readyCount} / ${agents.length} AGENTS ARMED (ON-DEMAND)`}
          </span>
        </div>
      </div>

      {/* Grid of 16 Agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const isActive = agent.status === 'ACTIVE';
          const isReady = agent.status.includes('STANDBY') || agent.status.includes('READY') || isActive;
          return (
            <div
              key={agent.name}
              onClick={() => setSelectedAgent(agent)}
              className="bg-[#0e1417] border border-zinc-800 hover:border-emerald-500/60 rounded-2xl p-5 transition-all cursor-pointer flex flex-col justify-between group hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isActive
                          ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                          : isReady
                          ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                          : 'bg-zinc-600'
                      }`}
                    />
                    <span className="font-mono text-xs text-zinc-400 font-bold truncate">
                      {agent.name.split('-')[1]}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md ${
                      isActive
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : isReady
                        ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition mb-2">
                  {agent.role}
                </h4>

                <p className="text-xs text-zinc-300 font-mono line-clamp-3 mb-4 leading-relaxed bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-900">
                  {agent.recent_logs[agent.recent_logs.length - 1]?.summary ||
                    'Operational and awaiting signals'}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400 font-medium">
                <span>Decisions: <strong className="text-white font-bold">{agent.decisions_count}</strong></span>
                <span className={agent.errors_count > 0 ? 'text-rose-400 font-bold' : 'text-zinc-500'}>
                  Errors: {agent.errors_count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1417] border border-zinc-700 rounded-2xl max-w-2xl w-full p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="font-mono text-xs text-emerald-400 font-bold tracking-wide">
                  {selectedAgent.name}
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight mt-1">
                  {selectedAgent.role}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-zinc-400 hover:text-white font-mono text-sm px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-lg hover:border-zinc-500 transition"
              >
                [CLOSE]
              </button>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 font-mono text-sm space-y-2.5 mb-5">
              <div className="flex justify-between text-zinc-300">
                <span>Total Decisions Executed:</span>
                <span className="text-emerald-400 font-bold text-base">{selectedAgent.decisions_count}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Total Exceptions / Errors:</span>
                <span className={selectedAgent.errors_count > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {selectedAgent.errors_count}
                </span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Last Telemetry Update:</span>
                <span className="text-white font-bold">
                  {new Date(selectedAgent.last_active_utc).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <h5 className="font-mono text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">
              Live Work Stream & Decisions
            </h5>
            <div className="bg-black/60 border border-zinc-800 rounded-xl p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-2.5">
              {selectedAgent.recent_logs.map((logItem, idx) => (
                <div key={idx} className="border-b border-zinc-900 pb-2 last:border-0">
                  <span className="text-emerald-500/80 font-semibold">
                    [{new Date(logItem.ts).toLocaleTimeString()}]
                  </span>{' '}
                  <span className="text-zinc-200">{logItem.summary || logItem.error}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
