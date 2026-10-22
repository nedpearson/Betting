import React, { useState } from 'react';
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
  Clock,
  CheckCircle2,
  ListOrdered,
  Activity,
  History
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
  const [activeSubTab, setActiveSubTab] = useState<'positions' | 'fills' | 'orders'>('positions');

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
  const openRiskNum = parseFloat(portfolio.total_open_risk || '0');

  const positions = portfolio.positions || [];
  const fills = portfolio.recent_fills || [];
  const orders = portfolio.orders || [];
  const restingOrders = portfolio.resting_orders || [];

  const formatTimestamp = (ts?: string | number) => {
    if (!ts) return 'Just now';
    try {
      const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
        ' (' + d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')';
    } catch {
      return String(ts);
    }
  };

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
              <span>Sync Cash & Fills</span>
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
          <span className="text-xs text-zinc-400 uppercase font-bold block mb-1">Committed Capital</span>
          <span className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
            ${(openRiskNum > 0 ? openRiskNum : (positions.reduce((acc, p) => acc + parseFloat(p.cost_basis || '0'), 0))).toFixed(2)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">
            Max Payout: ${(positions.reduce((acc, p) => acc + (parseFloat(p.max_payout || p.contracts) || 0), 0)).toFixed(2)}
          </span>
        </div>

        <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs text-zinc-400 uppercase font-bold block mb-1">Exchange Fees Paid</span>
          <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            ${feesNum.toFixed(2)}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Quadratic Taker Fees</span>
        </div>
      </div>

      {/* Ledger Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveSubTab('positions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-mono transition cursor-pointer ${
            activeSubTab === 'positions'
              ? 'bg-emerald-500 text-zinc-950 font-black shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Active Positions ({positions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fills')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-mono transition cursor-pointer ${
            activeSubTab === 'fills'
              ? 'bg-emerald-500 text-zinc-950 font-black shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Trade Execution History ({fills.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-mono transition cursor-pointer ${
            activeSubTab === 'orders'
              ? 'bg-emerald-500 text-zinc-950 font-black shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Kalshi Orders Ledger ({orders.length})</span>
          {restingOrders.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-black">
              {restingOrders.length} RESTING
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ACTIVE POSITIONS */}
      {activeSubTab === 'positions' && (
        <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Active Market Positions & Contracts
              </h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Live contracts currently held on Kalshi clearing ledger with upside potential
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-bold">
              {positions.length} Active Market Position
            </span>
          </div>

          {positions.length === 0 ? (
            <div className="p-10 text-center text-xs font-mono text-zinc-400 space-y-2">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="font-bold text-zinc-300 text-sm">No active open contracts currently held</p>
              <p className="text-zinc-500">100% of cash capital (${cashNum.toFixed(2)}) is preserved and available for high-conviction trades.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Market</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Avg Entry Price</th>
                    <th className="py-3 px-4 text-right">Capital Committed</th>
                    <th className="py-3 px-4 text-right">Max Payout</th>
                    <th className="py-3 px-4 text-right">Net Potential Upside</th>
                    <th className="py-3 px-4 text-right">Fees Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {positions.map((pos) => {
                    const contractsNum = parseFloat(pos.contracts || '0');
                    const costNum = parseFloat(pos.cost_basis || '0');
                    const maxPayoutNum = pos.max_payout ? parseFloat(pos.max_payout) : (contractsNum * 1.0);
                    const netUpside = Math.max(0, maxPayoutNum - costNum);
                    const upsidePct = costNum > 0 ? (netUpside / costNum) * 100 : 0;
                    const avgPriceCents = pos.avg_entry_cents || ((parseFloat(pos.avg_entry) * 100).toFixed(1) + '¢');

                    return (
                      <tr key={pos.ticker} className="hover:bg-zinc-900/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="font-bold text-emerald-400">{pos.ticker}</div>
                          <span className="text-[10px] text-zinc-400">Denver High Temp &lt;76°</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider ${
                              pos.side === 'yes'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            }`}
                          >
                            BUY {pos.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-white font-bold text-sm">
                          {pos.contracts} contracts
                        </td>
                        <td className="py-3.5 px-4 text-right text-zinc-200 font-bold">
                          {avgPriceCents} <span className="text-zinc-500 text-[10px]">(${parseFloat(pos.avg_entry).toFixed(4)})</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-zinc-200 font-bold">
                          ${costNum.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-400 font-bold text-sm">
                          ${maxPayoutNum.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-emerald-400 font-black block">+${netUpside.toFixed(2)}</span>
                          <span className="text-[10px] text-sky-400 font-semibold">(+{upsidePct.toFixed(0)}% ROI)</span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-amber-400">
                          ${pos.fees_paid}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRADE EXECUTION HISTORY / FILLS */}
      {activeSubTab === 'fills' && (
        <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Trade Execution History &amp; Exchange Fills
              </h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Exact trade receipts verified and executed by Kalshi clearing engine
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              {fills.length} verified fills
            </span>
          </div>

          {fills.length === 0 ? (
            <div className="p-10 text-center text-xs font-mono text-zinc-400">
              No recent trade fills recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Market</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Execution Price</th>
                    <th className="py-3 px-4 text-right">Taker Fee</th>
                    <th className="py-3 px-4 text-right">Total Debit</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {fills.map((f, i) => (
                    <tr key={f.fill_id || i} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                        {formatTimestamp(f.created_time)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {f.ticker}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.side === 'yes'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {f.action?.toUpperCase() || 'BUY'} {f.side?.toUpperCase() || 'YES'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white font-bold">
                        {f.contracts} contracts
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-200 font-bold">
                        {f.price_cents || `$${parseFloat(f.price).toFixed(4)}`}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-400">
                        ${parseFloat(f.fee).toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                        ${f.total_cost || ((parseFloat(f.contracts) * parseFloat(f.price)) + parseFloat(f.fee)).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          FILLED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KALSHI ORDERS LEDGER */}
      {activeSubTab === 'orders' && (
        <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Exchange Orders Ledger
              </h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                All submitted orders across active, filled, and resting states on Kalshi
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              {orders.length} orders
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="p-10 text-center text-xs font-mono text-zinc-400">
              No orders found on Kalshi exchange.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4">Market</th>
                    <th className="py-3 px-4">Side</th>
                    <th className="py-3 px-4 text-right">Contracts</th>
                    <th className="py-3 px-4 text-right">Limit Price</th>
                    <th className="py-3 px-4 text-center">Order Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {orders.map((o, idx) => (
                    <tr key={o.order_id || idx} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                        {formatTimestamp(o.created_time)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {o.ticker}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          o.side === 'yes'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {o.action?.toUpperCase() || 'BUY'} {o.side?.toUpperCase() || 'YES'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white font-bold">
                        {o.contracts} contracts
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-200 font-bold">
                        {o.price_cents || `$${parseFloat(o.price).toFixed(4)}`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          o.status === 'executed' || o.status === 'filled'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : o.status === 'resting'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                          {o.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Capital Management & Risk Policy Notice */}
      <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-300 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>CAPITAL MANAGEMENT &amp; INDEPENDENT RISK POLICY</span>
        </div>
        <p className="text-zinc-400 leading-relaxed">
          Hard risk parameters enforced with absolute veto power by Agent 11 (Portfolio Risk Manager). All orders execute on CFTC-regulated Kalshi exchange partition Shard 0 with segregated event contracts.
        </p>
      </div>
    </div>
  );
};
