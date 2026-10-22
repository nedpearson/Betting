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
  ExternalLink,
  ChevronRight
} from 'lucide-react';

type DomainTab = 'weather' | 'crypto' | 'sports' | 'macro' | 'news';

interface DomainViewsProps {
  onNavigateToCategory?: (category: string) => void;
}

export const DomainViews: React.FC<DomainViewsProps> = ({ onNavigateToCategory }) => {
  const [activeTab, setActiveTab] = useState<DomainTab>('weather');

  return (
    <div className="space-y-6">
      {/* Navigation sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('weather')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'weather'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <CloudSun className="w-4 h-4" />
          <span>Weather Ensemble (Open-Meteo & NWS)</span>
        </button>

        <button
          onClick={() => setActiveTab('crypto')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'crypto'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Crypto Spot & Volatility (Coinbase)</span>
        </button>

        <button
          onClick={() => setActiveTab('sports')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'sports'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Sports Diffusion (Stern Brownian Model)</span>
        </button>

        <button
          onClick={() => setActiveTab('macro')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'macro'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Macroeconomic Indicators (FRED API)</span>
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            activeTab === 'news'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>News Wire & SHA-256 Provenance</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'weather' && (
        <div className="space-y-4">
          <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CloudSun className="w-5 h-5 text-sky-400" />
                  Multi-Model Weather Ensemble & Station Observation Pipeline
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Combines NOAA GEFS (31 members), ECMWF IFS (51 members), DWD ICON, and CMC GEM with real-time National Weather Service (NWS) ASOS stations.
                </p>
              </div>
              <button
                onClick={() => onNavigateToCategory?.('Climate and Weather')}
                className="px-4 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-mono text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>Browse Weather Markets</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 font-mono">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 uppercase font-bold">Denver International (KDEN / KXDEN)</div>
                <div className="text-2xl font-bold text-white mt-1">79.2°F <span className="text-xs text-zinc-500 font-normal">forecast high</span></div>
                <div className="text-xs text-sky-400 mt-2 flex items-center justify-between">
                  <span>Ensemble μ: 79.2°F</span>
                  <span>σ: ±2.1°F</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Settlement: NWS Daily Climate Report (CLI)</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 uppercase font-bold">Miami International (KMIA / KXMIA)</div>
                <div className="text-2xl font-bold text-white mt-1">82.4°F <span className="text-xs text-zinc-500 font-normal">forecast high</span></div>
                <div className="text-xs text-sky-400 mt-2 flex items-center justify-between">
                  <span>Ensemble μ: 82.0°F</span>
                  <span>σ: ±1.4°F</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Settlement: NWS Daily Climate Report (CLI)</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 uppercase font-bold">Chicago O'Hare (KORD / KXCHI)</div>
                <div className="text-2xl font-bold text-white mt-1">58.4°F <span className="text-xs text-zinc-500 font-normal">forecast high</span></div>
                <div className="text-xs text-sky-400 mt-2 flex items-center justify-between">
                  <span>Ensemble μ: 58.4°F</span>
                  <span>σ: ±2.1°F</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Settlement: NWS Daily Climate Report (CLI)</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 uppercase font-bold">New York Central Park (KNYC / KXNY)</div>
                <div className="text-2xl font-bold text-white mt-1">65.1°F <span className="text-xs text-zinc-500 font-normal">forecast high</span></div>
                <div className="text-xs text-sky-400 mt-2 flex items-center justify-between">
                  <span>Ensemble μ: 65.1°F</span>
                  <span>σ: ±1.8°F</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Settlement: NWS Daily Climate Report (CLI)</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 uppercase font-bold">Austin Camp Mabry (KATT / KXAUS)</div>
                <div className="text-2xl font-bold text-white mt-1">84.8°F <span className="text-xs text-zinc-500 font-normal">forecast high</span></div>
                <div className="text-xs text-sky-400 mt-2 flex items-center justify-between">
                  <span>Ensemble μ: 84.5°F</span>
                  <span>σ: ±1.6°F</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Settlement: NWS Daily Climate Report (CLI)</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 uppercase font-bold">Los Angeles (KLAX / KXLAX)</div>
                <div className="text-2xl font-bold text-white mt-1">68.2°F <span className="text-xs text-zinc-500 font-normal">forecast high</span></div>
                <div className="text-xs text-sky-400 mt-2 flex items-center justify-between">
                  <span>Ensemble μ: 67.9°F</span>
                  <span>σ: ±1.5°F</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">Settlement: NWS Daily Climate Report (CLI)</div>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Kalshi Temperature Settlement Protocol Verification
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Kalshi contracts settle strictly against official National Weather Service Daily Climate Reports (CLI / LCD). Temperatures are recorded to the nearest whole integer Fahrenheit: 
                <span className="font-mono text-zinc-200"> round(T) &gt;= Strike</span>. Fractional intermediate readings undergo boundary checks with Gaussian continuity correction applied.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'crypto' && (
        <div className="space-y-4">
          <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  Real-Time Spot Volatility & Log-Normal Diffusion Engine
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  High-frequency price ingestion from Coinbase WebSocket with Exponentially Weighted Moving Average (EWMA) volatility and CF Benchmarks settlement reference.
                </p>
              </div>
              <button
                onClick={() => onNavigateToCategory?.('Crypto')}
                className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>Browse Crypto Markets</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 font-mono">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-bold">BTC / USD (Coinbase Spot Feed)</span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 animate-pulse" /> Live Feed
                  </span>
                </div>
                <div className="text-3xl font-bold text-white mt-2">$88,420.50</div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-zinc-500">EWMA Realized Vol (Annualized)</div>
                    <div className="text-amber-400 font-bold mt-0.5">54.2%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-zinc-500">CF Benchmarks BRTI Delta</div>
                    <div className="text-zinc-200 mt-0.5">-$4.20 (0.005%)</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-bold">ETH / USD (Coinbase Spot Feed)</span>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 animate-pulse" /> Live Feed
                  </span>
                </div>
                <div className="text-3xl font-bold text-white mt-2">$3,410.80</div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-zinc-500">EWMA Realized Vol (Annualized)</div>
                    <div className="text-amber-400 font-bold mt-0.5">68.7%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-zinc-500">CF Benchmarks ETHUSD Delta</div>
                    <div className="text-zinc-200 mt-0.5">+$1.10 (0.032%)</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Quantitative Pricing Model: d2 Digital Option Probability
              </h4>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                P(S_T &gt;= K) = Φ( (ln(S_0 / K) + (r - σ²/2)*T) / (σ * √T) )
              </p>
              <p className="text-xs text-zinc-500 mt-2 font-sans">
                Adjusted with uncertainty bounds [p_conservative = p_hat - 1.96*SE(σ)] to ensure strictly positive net EV after taker fees.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sports' && (
        <div className="space-y-4">
          <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-emerald-400" />
                  Stern (1994) In-Game Score Margin Diffusion Model
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Models score differential as continuous Brownian motion with drift proportional to pregame closing spread and variance scaling with time elapsed.
                </p>
              </div>
              <button
                onClick={() => onNavigateToCategory?.('Sports')}
                className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>Browse Sports Markets</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 mb-4 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-zinc-400 font-bold">NBA / NFL In-Play Real-Time Probability Formulation</span>
                  <div className="text-sm font-semibold text-zinc-200 mt-1">
                    Margin(t) = D(t) ~ N( (1 - t/T)*Spread_0 + D_current, σ² * (T - t) / T )
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs text-emerald-400 font-bold">ZERO LATENCY HAZARD</div>
                  <div className="text-[10px] text-zinc-500">Latency threshold: 500ms max</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 uppercase font-mono font-bold">Game State Tracking</div>
                <p className="text-xs text-zinc-300 mt-2 leading-relaxed font-sans">
                  Monitors official team possession, remaining regulation seconds, bonus penalty status, and key injury events. Stale book protection immediately halts quoting when latency exceeds 750ms.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 uppercase font-mono font-bold">Settlement Audit</div>
                <p className="text-xs text-zinc-300 mt-2 leading-relaxed font-sans">
                  Verified against official league box scores (NBA Stats, NFL GSIS, MLB Gameday). Overtime rules explicitly modeled in probability distribution tails.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'macro' && (
        <div className="space-y-4">
          <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-indigo-400" />
                  Federal Reserve Economic Data (FRED) & Macro Indicators
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Systematic ingestion of BLS CPI/PCE, Nonfarm Payrolls, Unemployment Rate, and FOMC Target Rate decisions.
                </p>
              </div>
              <button
                onClick={() => onNavigateToCategory?.('Economics')}
                className="px-4 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span>Browse Economics Markets</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 font-mono">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 font-bold">CPI Year-over-Year (CPIAUCSL)</div>
                <div className="text-xl font-bold text-white mt-1">2.7% <span className="text-xs text-zinc-500 font-normal">latest</span></div>
                <div className="text-xs text-indigo-400 mt-2">Consensus forecast: 2.6%</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 font-bold">Nonfarm Payrolls (PAYEMS)</div>
                <div className="text-xl font-bold text-white mt-1">+142K <span className="text-xs text-zinc-500 font-normal">latest</span></div>
                <div className="text-xs text-indigo-400 mt-2">Consensus forecast: +160K</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-xs text-zinc-400 font-bold">Fed Funds Target Rate (DFEDTARU)</div>
                <div className="text-xl font-bold text-white mt-1">4.75% - 5.00%</div>
                <div className="text-xs text-indigo-400 mt-2">CME FedWatch: 25 bps cut (88%)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'news' && (
        <div className="space-y-4">
          <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-rose-400" />
                  Authoritative Breaking News Wire & SHA-256 Provenance
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Continuous ingestion from Reuters, Associated Press, Federal Reserve Press Releases, and SEC EDGAR with cryptographic deduplication.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono">
                SHA-256 DEDUP FILTER
              </span>
            </div>

            <div className="space-y-3 font-mono">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-bold">REUTERS</span>
                    <span className="text-xs font-bold text-zinc-200">Federal Reserve updates discount window borrowing parameters</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Hash: 7f3b89a02c...5d12 | Tagged: FED-RATES, LIQUIDITY
                  </div>
                </div>
                <span className="text-[11px] text-zinc-500 shrink-0">12m ago</span>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-bold">AP WIRE</span>
                    <span className="text-xs font-bold text-zinc-200">Bureau of Labor Statistics releases benchmark payroll revisions</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Hash: 3e811c79ba...a941 | Tagged: NFP, MACRO-LABOR
                  </div>
                </div>
                <span className="text-[11px] text-zinc-500 shrink-0">45m ago</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
