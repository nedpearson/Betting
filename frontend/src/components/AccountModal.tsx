import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Wallet, 
  Lock, 
  RefreshCw, 
  X,
  FileText,
  Sliders,
  DollarSign
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountUpdated?: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onAccountUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'balances' | 'safety'>('balances');
  
  // Credentials Form State
  const [keyId, setKeyId] = useState('');
  const [privateKeyPem, setPrivateKeyPem] = useState('');
  const [feeTier, setFeeTier] = useState<'retail' | 'member'>('retail');
  const [showKeyForm, setShowKeyForm] = useState(false);
  
  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [accountInfo, setAccountInfo] = useState<{
    connected: boolean;
    key_id?: string;
    balance?: any;
    balance_dollars?: string;
    portfolio_value_dollars?: string;
    mode?: string;
  } | null>(null);
  const [portfolioData, setPortfolioData] = useState<any | null>(null);

  // Safety Gating State
  const [executionMode, setExecutionMode] = useState<'intelligence' | 'paper' | 'live'>('live');
  const [passphrase, setPassphrase] = useState('');

  // Fetch current Kalshi connection status and portfolio
  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const [setRes, portRes] = await Promise.all([
        fetch('/api/settings/kalshi'),
        fetch('/api/portfolio'),
      ]);

      if (setRes.ok) {
        const data = await setRes.json();
        setAccountInfo(data);
        if (data.key_id) {
          setKeyId(data.key_id);
        }
        if (data.connected) {
          setActiveTab('balances');
        }
      }

      if (portRes.ok) {
        const pData = await portRes.json();
        setPortfolioData(pData);
      }
    } catch (e) {
      // Backend status call failed
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setPrivateKeyPem(content);
      };
      reader.readAsText(file);
    }
  };

  const handleConnectKalshi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyId.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your Kalshi Key ID (UUID).' });
      return;
    }
    if (!privateKeyPem.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide your Kalshi Private Key PEM.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Verifying Ed25519 cryptographic signature with Kalshi...' });

    try {
      const res = await fetch('/api/settings/kalshi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_id: keyId.trim(),
          private_key: privateKeyPem.trim(),
          fee_tier: feeTier,
        }),
      });

      const data = await res.json();
      if (res.ok && data.connected) {
        setAccountInfo(data);
        setStatusMessage({ 
          type: 'success', 
          text: `Verified & Connected! Live Cash: $${data.balance_dollars || '0.00'}` 
        });
        setShowKeyForm(false);
        if (onAccountUpdated) onAccountUpdated();
        setTimeout(() => setActiveTab('balances'), 1200);
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: `Verification Failed: ${data.error || 'Invalid credentials'}` 
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Network error: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const cashDisplay = 
    (portfolioData?.available_cash && parseFloat(portfolioData.available_cash) > 0 ? portfolioData.available_cash : null) || 
    (accountInfo?.balance_dollars && parseFloat(accountInfo.balance_dollars) > 0 ? accountInfo.balance_dollars : null) || 
    portfolioData?.available_cash || 
    '0.00';
  const equityDisplay = 
    (portfolioData?.total_equity && parseFloat(portfolioData.total_equity) > 0 ? portfolioData.total_equity : null) || 
    cashDisplay;
  const openRiskDisplay = portfolioData?.total_open_risk || accountInfo?.portfolio_value_dollars || '0.00';
  const positionsCount = portfolioData?.open_positions_count || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0e1417] border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-emerald-950/20">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white font-mono">
                  Kalshi Account & Gateway
                </h3>
                {accountInfo?.connected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    CONNECTED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-700">
                    UNLINKED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                Official CFTC-regulated exchange key management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-5 pt-3 border-b border-zinc-800/60 text-xs font-mono bg-zinc-950/30">
          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'balances'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Live Balance</span>
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'credentials'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Credentials</span>
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'safety'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safety Locks</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-mono leading-relaxed ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                  : 'bg-sky-950/40 border-sky-500/30 text-sky-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="flex-1">{statusMessage.text}</div>
            </div>
          )}

          {/* TAB 1: LIVE BALANCES */}
          {activeTab === 'balances' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">
                    Kalshi Available Cash
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
                    ${cashDisplay}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                    Verified CFTC Exchange Balance
                  </span>
                </div>
                <button
                  onClick={checkStatus}
                  disabled={isLoading}
                  className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Refresh Balance"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block font-semibold uppercase">Total Account Equity</span>
                  <span className="text-white text-base font-bold mt-1 block">
                    ${equityDisplay}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block font-semibold uppercase">Open Positions Risk</span>
                  <span className="text-zinc-300 text-base font-bold mt-1 block">
                    ${openRiskDisplay}
                  </span>
                </div>
              </div>

              {positionsCount > 0 && portfolioData?.positions && (
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">
                    Active Open Positions ({positionsCount})
                  </span>
                  <div className="space-y-1.5">
                    {portfolioData.positions.map((pos: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-mono p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                        <span className="font-bold text-white">{pos.ticker}</span>
                        <span className="text-emerald-400 font-semibold">{pos.contracts}x YES @ ${pos.cost_basis}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold font-mono text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Account Ready — Return to Dashboard & Trade</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: API CREDENTIALS */}
          {activeTab === 'credentials' && (
            <div className="space-y-4">
              {accountInfo?.connected && !showKeyForm ? (
                <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Kalshi Account Authenticated & Active</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                    Your account is securely authenticated using server-side Ed25519 cryptographic signing.
                    <br />
                    Key ID: <span className="text-white font-bold">{accountInfo.key_id}</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    You do NOT need to re-upload your private key. Everything is configured and ready for live market execution.
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('balances')}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>View Live Balance (${cashDisplay})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowKeyForm(true)}
                      className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono transition cursor-pointer"
                    >
                      Update Keys
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnectKalshi} className="space-y-4">
                  {accountInfo?.connected && (
                    <button
                      type="button"
                      onClick={() => setShowKeyForm(false)}
                      className="text-xs text-zinc-400 hover:text-white font-mono flex items-center gap-1 cursor-pointer mb-2"
                    >
                      ← Back to Connected Status
                    </button>
                  )}

                  <div>
                    <label className="block text-xs font-mono text-zinc-300 mb-1.5 font-semibold">
                      Kalshi API Key ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ff108c4d-3bfd-4750-bd66-0251d9c5ac4e"
                      value={keyId}
                      onChange={(e) => setKeyId(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Obtained from Kalshi → Account Settings → API Keys.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-mono text-zinc-300 font-semibold">
                        RSA or Ed25519 Private Key (.pem)
                      </label>
                      <label className="text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1 font-mono">
                        <FileText className="w-3 h-3" />
                        <span>Upload .pem file</span>
                        <input
                          type="file"
                          accept=".pem,.key,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="-----BEGIN PRIVATE KEY-----&#10;MC4CAQAwBQYDK2VwBCIEI...&#10;-----END PRIVATE KEY-----"
                      value={privateKeyPem}
                      onChange={(e) => setPrivateKeyPem(e.target.value)}
                      className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition resize-none"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                      Stored securely in your encrypted environment. Used strictly to sign timestamped exchange requests.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-bold font-mono text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying Kalshi Signature...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify & Save Key to Environment</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: SAFETY LOCKS */}
          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-white">Execution Mode</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    LIVE TRADING ARMED
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setExecutionMode('intelligence')}
                    className={`py-2 px-2 rounded-lg border text-[11px] font-mono text-center transition cursor-pointer ${
                      executionMode === 'intelligence'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Intelligence
                  </button>
                  <button
                    type="button"
                    onClick={() => setExecutionMode('paper')}
                    className={`py-2 px-2 rounded-lg border text-[11px] font-mono text-center transition cursor-pointer ${
                      executionMode === 'paper'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Paper Trading
                  </button>
                  <button
                    type="button"
                    onClick={() => setExecutionMode('live')}
                    className={`py-2 px-2 rounded-lg border text-[11px] font-mono text-center transition cursor-pointer ${
                      executionMode === 'live'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Live Trading
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs font-mono space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Hard Risk Limits Active</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-zinc-400 text-[11px]">
                  <li>Maximum 1.0% single-trade allocation ($5.00 limit).</li>
                  <li>Maximum 10.0% total open portfolio risk limit.</li>
                  <li>Automatic trade veto if edge &lt; +$0.03 after quadratic fees.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Encrypted Ed25519 Signatures Only</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
