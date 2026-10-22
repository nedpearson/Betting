import React, { useState } from 'react';
import { 
  CloudSun, 
  TrendingUp, 
  Trophy, 
  Landmark, 
  Newspaper, 
  Activity, 
  ShieldCheck, 
  Clock, 
  Zap, 
  BarChart3, 
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';

type DomainTab = 'weather' | 'crypto' | 'sports' | 'macro' | 'news';

export const DomainViews: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DomainTab>('weather');

  return (
    <div className="space-y-6">
      {/* Navigation sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('weather')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'weather'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CloudSun className="w-4 h-4" />
          <span>Weather Ensemble (Open-Meteo & NWS)</span>
        </button>

        <button
          onClick={() => setActiveTab('crypto')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'crypto'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Crypto Spot & Log-Normal Vol (Coinbase)</span>
        </button>

        <button
          onClick={() => setActiveTab('sports')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'sports'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>In-Game Sports (Stern Brownian Model)</span>
        </button>

        <button
          onClick={() => setActiveTab('macro')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'macro'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Macroeconomic Indicators (FRED API)</span>
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'news'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>Authoritative RSS Wire (SHA-256 Provenance)</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'weather' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <CloudSun className="w-5 h-5 text-sky-400" />
                  Multi-Model Weather Ensemble & Station Observation Pipeline
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Combines NOAA GEFS (31 ensemble members), ECMWF IFS (51 members), and ICON with real-time National Weather Service (NWS) ASOS stations.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-mono">
                SETTLEMENT: INTEGER °F ROUNDING
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="text-xs text-slate-400 uppercase font-mono">Chicago Midway (KMDW / KXCHI)</div>
                <div className="text-2xl font-bold text-white mt-1">54.2°F <span className="text-xs text-slate-400 font-normal">observed</span></div>
                <div className="text-xs text-sky-400 mt-2 flex items-center justify-between">
                  <span>Ensemble μ: 58.4°F</span>
                  <span>σ: ±2.1°F</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Settlement source: NWS Local Climatological Data (LCD)</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="text-xs text-slate-400 uppercase font-mono">New York Central Park (KNYC / KXNYC)</div>
                <div className="text-2xl font-bold text-white mt-1">62.8°F <span className="text-xs text-slate-400 font-normal">observed</span></div>
                <div className="text-xs text-sky-400 mt-2 flex items-center justify-between">
                  <span>Ensemble μ: 65.1°F</span>
                  <span>σ: ±1.8°F</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Settlement source: NWS Local Climatological Data (LCD)</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="text-xs text-slate-400 uppercase font-mono">Miami International (KMIA / KXFLA)</div>
                <div className="text-2xl font-bold text-white mt-1">79.5°F <span className="text-xs text-slate-400 font-normal">observed</span></div>
                <div className="text-xs text-sky-400 mt-2 flex items-center justify-between">
                  <span>Ensemble μ: 82.0°F</span>
                  <span>σ: ±1.4°F</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Settlement source: NWS Local Climatological Data (LCD)</div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Kalshi Temperature Settlement Protocol Verification
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Kalshi contracts settle strictly against official National Weather Service Daily Climate Reports (CLI / LCD). Temperatures are recorded to the nearest whole integer Fahrenheit: 
                <span className="font-mono text-slate-200"> round(T) &gt;= Strike</span>. Fractional intermediate readings undergo boundary checks with continuity correction applied.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'crypto' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  Real-Time Spot Volatility & Log-Normal Diffusion Engine
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  High-frequency price ingestion from Coinbase WebSocket with Exponentially Weighted Moving Average (EWMA) volatility and CF Benchmarks settlement reference.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono">
                DIFFUSION: BLACK-SCHOLES DIGITAL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">BTC / USD (Coinbase Spot)</span>
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Live Feed
                  </span>
                </div>
                <div className="text-3xl font-mono font-bold text-white mt-2">$88,420.50</div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">EWMA Realized Vol (Annualized)</div>
                    <div className="font-mono text-amber-400 font-bold mt-0.5">54.2%</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">CF Benchmarks BRTI Delta</div>
                    <div className="font-mono text-slate-200 mt-0.5">-$4.20 (0.005%)</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">ETH / USD (Coinbase Spot)</span>
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Live Feed
                  </span>
                </div>
                <div className="text-3xl font-mono font-bold text-white mt-2">$3,410.80</div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">EWMA Realized Vol (Annualized)</div>
                    <div className="font-mono text-amber-400 font-bold mt-0.5">68.7%</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">CF Benchmarks ETHUSD Delta</div>
                    <div className="font-mono text-slate-200 mt-0.5">+$1.10 (0.032%)</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Quantitative Pricing Model: d2 Digital Option Probability
              </h4>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                P(S_T &gt;= K) = Φ( (ln(S_0 / K) + (r - σ²/2)*T) / (σ * √T) )
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Adjusted with uncertainty bounds [p_conservative = p_hat - 1.96*SE(σ)] to ensure strictly positive net EV after taker fees.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sports' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-emerald-400" />
                  Stern (1994) In-Game Score Margin Diffusion Model
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Models score differential as continuous Brownian motion with drift proportional to pregame closing spread and variance scaling with time elapsed.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
                BROWNIAN DRIFT DYNAMICS
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-slate-400">NBA / NFL In-Play Real-Time Probability Formulation</span>
                  <div className="text-sm font-semibold text-slate-200 mt-1">
                    Margin(t) = D(t) ~ N( (1 - t/T)*Spread_0 + D_current, σ² * (T - t) / T )
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-emerald-400 font-bold">ZERO LATENCY HAZARD</div>
                  <div className="text-[10px] text-slate-500">Latency threshold: 500ms max</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800">
                <div className="text-xs text-slate-400 uppercase font-mono">Game State Tracking</div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Monitors official team possession, remaining regulation seconds, bonus penalty status, and key injury events. Stale book protection immediately halts quoting when latency exceeds 750ms.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800">
                <div className="text-xs text-slate-400 uppercase font-mono">Settlement Audit</div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Verified against official league box scores (NBA Stats, NFL GSIS, MLB Gameday). Overtime rules explicitly modeled in probability distribution tails.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'macro' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-indigo-400" />
                  Federal Reserve Economic Data (FRED) & Macro Indicators
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Systematic ingestion of BLS CPI/PCE, Nonfarm Payrolls, Unemployment Rate, and FOMC Target Rate decisions.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono">
                OFFICIAL BLS / BEA / FED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs font-mono text-slate-400">CPI Year-over-Year (CPIAUCSL)</div>
                <div className="text-xl font-bold text-white mt-1">2.7% <span className="text-xs text-slate-400 font-normal">latest</span></div>
                <div className="text-xs text-indigo-400 mt-2">Consensus forecast: 2.6%</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs font-mono text-slate-400">Nonfarm Payrolls (PAYEMS)</div>
                <div className="text-xl font-bold text-white mt-1">+142K <span className="text-xs text-slate-400 font-normal">latest</span></div>
                <div className="text-xs text-indigo-400 mt-2">Consensus forecast: +160K</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-xs font-mono text-slate-400">Fed Funds Target Rate (DFEDTARU)</div>
                <div className="text-xl font-bold text-white mt-1">4.75% - 5.00%</div>
                <div className="text-xs text-indigo-400 mt-2">CME FedWatch: 25 bps cut (88%)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'news' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-rose-400" />
                  Authoritative Breaking News Wire & SHA-256 Provenance
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Continuous ingestion from Reuters, Associated Press, Federal Reserve Press Releases, and SEC EDGAR with cryptographic deduplication.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">
                SHA-256 DEDUP FILTER
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">REUTERS</span>
                    <span className="text-xs font-medium text-slate-200">Federal Reserve updates discount window borrowing parameters</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Hash: 7f3b89a02c...5d12 | Tagged: FED-RATES, LIQUIDITY
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-500 shrink-0">12m ago</span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">AP WIRE</span>
                    <span className="text-xs font-medium text-slate-200">Bureau of Labor Statistics releases benchmark payroll revisions</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Hash: 3e811c79ba...a941 | Tagged: NFP, MACRO-LABOR
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-500 shrink-0">45m ago</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
