import React, { useState, useEffect } from 'react';
import type { FeedHealth } from '../types';
import { fetchHealth } from '../api';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  Wifi, 
  AlertCircle
} from 'lucide-react';

export const FeedHealthView: React.FC = () => {
  const [feeds, setFeeds] = useState<FeedHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchHealth();
      setFeeds(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load feed health', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (state: FeedHealth['state']) => {
    switch (state) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> CONNECTED
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> DEGRADED
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Clock className="w-3 h-3" /> STALE
          </span>
        );
      case 'DISCONNECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> DISCONNECTED
          </span>
        );
      case 'NOT_CONFIGURED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <HelpCircle className="w-3 h-3" /> NOT CONFIGURED
          </span>
        );
    }
  };

  const connectedCount = feeds.filter(f => f.state === 'CONNECTED').length;
  const totalCount = feeds.length;
  const hasIssues = feeds.some(f => f.state === 'DEGRADED' || f.state === 'DISCONNECTED' || f.state === 'STALE');

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Data Ingestion Status</span>
            <Wifi className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <span>{connectedCount}/{totalCount}</span>
            <span className="text-xs font-normal text-slate-400">active feeds</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {connectedCount === totalCount ? 'All external feeds nominal' : 'Some feeds degraded or inactive'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Settlement Grade</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {feeds.filter(f => f.settlement_grade && f.state === 'CONNECTED').length} Active
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Verified authoritative primary sources
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Avg Pipeline Latency</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400">
            {feeds.length > 0 && feeds.some(f => f.latency_ms_p50)
              ? `${Math.round(feeds.reduce((acc, f) => acc + (f.latency_ms_p50 || 0), 0) / feeds.filter(f => f.latency_ms_p50).length)} ms`
              : 'Sub-second'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            P50 round-trip ingestion latency
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Pipeline Health</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className={`text-2xl font-bold ${hasIssues ? 'text-amber-400' : 'text-emerald-400'}`}>
            {hasIssues ? 'ATTENTION' : 'OPTIMAL'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Zero synthetic data permitted
          </p>
        </div>
      </div>

      {/* Main Feeds Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              External Feed Registry & Strict TTL Telemetry
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status, polling transport, staleness guards, and licensing compliance for every independent source.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Updated: {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              onClick={load}
              disabled={loading}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 transition"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Source / Feed</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Transport</th>
                <th className="py-3 px-4">Data Age / TTL</th>
                <th className="py-3 px-4">Latency (p50)</th>
                <th className="py-3 px-4">Reliability</th>
                <th className="py-3 px-4">Processed / Errors</th>
                <th className="py-3 px-4">Compliance / Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {feeds.map((feed) => (
                <tr key={feed.name} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200">{feed.name}</div>
                    <div className="text-[11px] text-slate-400 font-sans">{feed.description}</div>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(feed.state)}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                      {feed.transport}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-200">
                      {feed.age_sec !== null ? `${feed.age_sec.toFixed(1)}s` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      TTL: {feed.stale_after_sec}s
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {feed.latency_ms_p50 ? `${feed.latency_ms_p50} ms` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-200 font-bold">
                      {(feed.reliability * 100).toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-200">{feed.messages_total.toLocaleString()} msgs</div>
                    {feed.errors_total > 0 && (
                      <div className="text-rose-400 text-[10px] flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3" />
                        {feed.errors_total} errors
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      {feed.settlement_grade && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          SETTLEMENT GRADE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-1 max-w-xs truncate" title={feed.licensing_note}>
                      {feed.licensing_note}
                    </div>
                  </td>
                </tr>
              ))}
              {feeds.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No feed health telemetry recorded yet. Engine daemon will populate on heartbeat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
