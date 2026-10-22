import React, { useState } from 'react';
import type { AgentSnapshot } from '../types';
import { Bot, CheckCircle2, AlertOctagon, Terminal, Activity } from 'lucide-react';

interface AgentCommandCenterProps {
  agents: AgentSnapshot[];
}

export const AgentCommandCenter: React.FC<AgentCommandCenterProps> = ({ agents }) => {
  const [selectedAgent, setSelectedAgent] = useState<AgentSnapshot | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-400" />
            Specialized Multi-Agent Command Center
          </h2>
          <p className="text-xs text-zinc-500 font-mono">
            16 coordinated deterministic & quantitative agents communicating via typed event contracts
          </p>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded">
          {agents.filter((a) => a.status === 'ACTIVE').length} / {agents.length} Agents Active
        </span>
      </div>

      {/* Grid of 16 Agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const isActive = agent.status === 'ACTIVE';
          return (
            <div
              key={agent.name}
              onClick={() => setSelectedAgent(agent)}
              className="bg-[#0e1417] border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                      }`}
                    />
                    <span className="font-mono text-[10px] text-zinc-400 font-semibold truncate">
                      {agent.name.split('-')[1]}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition mb-1">
                  {agent.role}
                </h4>

                <p className="text-[11px] text-zinc-400 font-mono line-clamp-2 mb-3">
                  {agent.recent_logs[agent.recent_logs.length - 1]?.summary ||
                    'Operational and awaiting signals'}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>Decisions: {agent.decisions_count}</span>
                <span className={agent.errors_count > 0 ? 'text-rose-400' : 'text-zinc-500'}>
                  Errors: {agent.errors_count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e1417] border border-zinc-800 rounded-xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="font-mono text-xs text-emerald-400 font-semibold">
                  {selectedAgent.name}
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {selectedAgent.role}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-zinc-500 hover:text-white font-mono text-xs"
              >
                [CLOSE]
              </button>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 font-mono text-xs space-y-2 mb-4">
              <div className="flex justify-between text-zinc-400">
                <span>Total Decisions Executed:</span>
                <span className="text-white font-bold">{selectedAgent.decisions_count}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Total Exceptions / Errors:</span>
                <span className={selectedAgent.errors_count > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {selectedAgent.errors_count}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Last Telemetry Update:</span>
                <span className="text-zinc-300">
                  {new Date(selectedAgent.last_active_utc).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <h5 className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Recent Decision Logs
            </h5>
            <div className="bg-black/50 border border-zinc-800/80 rounded-lg p-3 font-mono text-xs max-h-60 overflow-y-auto space-y-2">
              {selectedAgent.recent_logs.map((logItem, idx) => (
                <div key={idx} className="border-b border-zinc-900 pb-1.5 last:border-0">
                  <span className="text-zinc-500 text-[10px]">
                    [{new Date(logItem.ts).toLocaleTimeString()}]
                  </span>{' '}
                  <span className="text-zinc-300">{logItem.summary || logItem.error}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
