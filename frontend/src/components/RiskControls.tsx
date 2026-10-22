import React from 'react';
import { ShieldAlert, Lock, CheckCircle, Sliders, AlertTriangle } from 'lucide-react';

interface RiskControlsProps {
  onTriggerKillSwitch: () => void;
  isHalted?: boolean;
  onResumeTrading?: () => void;
}

export const RiskControls: React.FC<RiskControlsProps> = ({ 
  onTriggerKillSwitch, 
  isHalted = false, 
  onResumeTrading 
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-emerald-400" />
          Capital Management & Independent Risk Policy
        </h2>
        <p className="text-xs text-zinc-500 font-mono">
          Hard risk parameters enforced with absolute veto power by Agent 11 (Portfolio Risk Manager)
        </p>
      </div>

      {/* Policy Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-4">
          <span className="text-[10px] text-zinc-500 uppercase block mb-1">Max Risk Per Trade</span>
          <span className="text-xl font-bold text-white">1.0% ($5.00)</span>
          <p className="text-[11px] text-zinc-400 mt-2">
            No single trade can deploy more than 1% of total bankroll under any circumstance.
          </p>
        </div>

        <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-4">
          <span className="text-[10px] text-zinc-500 uppercase block mb-1">Combined Open Exposure</span>
          <span className="text-xl font-bold text-amber-400">10.0% ($50.00)</span>
          <p className="text-[11px] text-zinc-400 mt-2">
            Total active positions capped at 10% of portfolio. Agent 11 automatically vetoes further entries.
          </p>
        </div>

        <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-4">
          <span className="text-[10px] text-zinc-500 uppercase block mb-1">Daily Loss Cutoff</span>
          <span className="text-xl font-bold text-rose-400">3.0% ($15.00)</span>
          <p className="text-[11px] text-zinc-400 mt-2">
            If daily realized and committed loss exceeds $15, trading automatically halts for the calendar day.
          </p>
        </div>

        <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-4">
          <span className="text-[10px] text-zinc-500 uppercase block mb-1">Drawdown Review Trigger</span>
          <span className="text-xl font-bold text-rose-400">10.0% ($50.00)</span>
          <p className="text-[11px] text-zinc-400 mt-2">
            A 10% peak equity decline triggers an automated safety freeze and mandates quantitative audit.
          </p>
        </div>
      </div>

      {/* Safety Gating Status */}
      <div className="bg-[#0e1417] border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-400" />
          Triple-Lock Live Order Execution Gating
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs mb-6">
          <div className="bg-zinc-900/80 border border-emerald-900/60 rounded-lg p-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <CheckCircle className="h-4 w-4" />
              <span>Gate 1: Default Mode</span>
            </div>
            <p className="text-zinc-400">
              Intelligence Only + Paper Trading default. Real money trading is disabled at system boot.
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
              <Lock className="h-4 w-4" />
              <span>Gate 2: Config Phrase</span>
            </div>
            <p className="text-zinc-400">
              Requires exact passphrase match: "I AUTHORIZE LIVE KALSHI ORDERS AND ACCEPT THE RISK OF LOSS"
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
              <Lock className="h-4 w-4" />
              <span>Gate 3: Admin Auth</span>
            </div>
            <p className="text-zinc-400">
              Every single order submission requires bearer token authorization with manual confirmation.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
          <div>
            <span className="text-xs font-mono font-bold text-white block">Emergency Platform Kill Switch</span>
            <span className="text-[11px] font-mono text-zinc-500">
              Immediately cancels pending orders and locks the platform against further executions.
            </span>
          </div>
          {isHalted ? (
            <button
              onClick={onResumeTrading}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs transition animate-pulse shadow-md shadow-emerald-950/40"
            >
              RESUME TRADING
            </button>
          ) : (
            <button
              onClick={onTriggerKillSwitch}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs transition"
            >
              TRIGGER EMERGENCY HALT
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
