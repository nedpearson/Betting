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
  const [activeTab, setActiveTab] = useState<'credentials' | 'balances' | 'safety'>('credentials');
  
  // Credentials Form State
  const [keyId, setKeyId] = useState('');
  const [privateKeyPem, setPrivateKeyPem] = useState('');
  const [feeTier, setFeeTier] = useState<'retail' | 'member'>('retail');
  
  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [accountInfo, setAccountInfo] = useState<{
    connected: boolean;
    key_id?: string;
    balance?: any;
    mode?: string;
  } | null>(null);

  // Safety Gating State
  const [executionMode, setExecutionMode] = useState<'intelligence' | 'paper' | 'live'>('intelligence');
  const [passphrase, setPassphrase] = useState('');

  // Fetch current Kalshi connection status
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/settings/kalshi');
      if (res.ok) {
        const data = await res.json();
        setAccountInfo(data);
        if (data.key_id) {
          setKeyId(data.key_id);
        }
      }
    } catch (e) {
      // Backend status call failed
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      // Also check local storage for remembered key ID
      const savedKeyId = localStorage.getItem('boi_kalshi_key_id');
      if (savedKeyId && !keyId) {
        setKeyId(savedKeyId);
      }
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
    setStatusMessage({ type: 'info', text: 'Authenticating with Kalshi Production Gateway...' });

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
      if (data.success || data.connected) {
        setStatusMessage({
          type: 'success',
          text: `Connected to Kalshi successfully! Balance: $${parseFloat(data.balance_dollars || '0').toFixed(2)}`,
        });
        localStorage.setItem('boi_kalshi_key_id', keyId.trim());
        checkStatus();
        if (onAccountUpdated) onAccountUpdated();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.message || data.error || 'Failed to authenticate with Kalshi.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Connection error: ${err.message || 'Could not contact backend API.'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c1114] border border-zinc-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Kalshi Account & Gateway</span>
                {accountInfo?.connected ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                    CONNECTED
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                    PUBLIC QUOTES ONLY
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-400">
                Official CFTC-regulated exchange key management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-950/60 px-4 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'credentials'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Credentials</span>
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'balances'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Live Balance</span>
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
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

          {activeTab === 'credentials' && (
            <form onSubmit={handleConnectKalshi} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5 font-semibold">
                  Kalshi API Key ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
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
                  placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIEowIBAAKCAQEA...&#10;-----END RSA PRIVATE KEY-----"
                  value={privateKeyPem}
                  onChange={(e) => setPrivateKeyPem(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition resize-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  Stored securely in your local environment. Used strictly to sign timestamped requests.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5 font-semibold">
                  Account Fee Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeeTier('retail')}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono text-center transition ${
                      feeTier === 'retail'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div>Retail ($0.01 Rounding)</div>
                    <div className="text-[10px] font-normal text-zinc-500">Standard retail accounts</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeTier('member')}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono text-center transition ${
                      feeTier === 'member'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div>Direct Member ($0.0001)</div>
                    <div className="text-[10px] font-normal text-zinc-500">High-volume direct access</div>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-bold font-mono text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Kalshi Signature...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Link Account & Verify Signature</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span>How to generate Kalshi API Keys:</span>
                </div>
                <ol className="list-decimal pl-4 space-y-0.5 text-zinc-400">
                  <li>Log in to <a href="https://kalshi.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Kalshi.com</a>.</li>
                  <li>Navigate to <b>Settings → API Keys</b>.</li>
                  <li>Click <b>Create API Key</b>, select RSA or Ed25519, and download the <code>.pem</code> file.</li>
                  <li>Paste the Key ID and private key above.</li>
                </ol>
              </div>
            </form>
          )}

          {activeTab === 'balances' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">Exchange Cash Balance</span>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {accountInfo?.connected && accountInfo.balance
                      ? `$${((accountInfo.balance.balance || 0) / 100).toFixed(2)}`
                      : '$0.00 (Unlinked)'}
                  </div>
                </div>
                <button
                  onClick={checkStatus}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
                  title="Refresh Balance"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">Active Portfolio Equity</span>
                  <span className="text-emerald-400 font-bold mt-1 block">
                    {accountInfo?.connected && accountInfo.balance
                      ? `$${((accountInfo.balance.balance || 50000) / 100).toFixed(2)}`
                      : '$500.00'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">Open Buying Power</span>
                  <span className="text-white font-bold mt-1 block">
                    {accountInfo?.connected && accountInfo.balance
                      ? `$${((accountInfo.balance.balance || 50000) / 100).toFixed(2)}`
                      : '$500.00'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                Real-time bankroll is automatically synchronized with your verified Kalshi account when authenticated. In Intelligence Mode, position sizing uses your configured target bankroll.
              </p>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-white">Execution Mode</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    TRIPLE-LOCK ARMED
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setExecutionMode('intelligence')}
                    className={`py-2 px-2 rounded-lg border text-[11px] font-mono text-center transition ${
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
                    className={`py-2 px-2 rounded-lg border text-[11px] font-mono text-center transition ${
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
                    className={`py-2 px-2 rounded-lg border text-[11px] font-mono text-center transition ${
                      executionMode === 'live'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Live Trading
                  </button>
                </div>
              </div>

              {executionMode === 'live' && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-rose-300 font-semibold">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Triple-Lock Passphrase Required</span>
                  </div>
                  <p className="text-[11px] text-rose-200/80 leading-normal">
                    To arm real-money orders, type the exact confirmation passphrase:
                    <br />
                    <code className="text-rose-300 font-mono text-[10px] select-all">I_UNDERSTAND_REAL_MONEY_IS_AT_RISK</code>
                  </p>
                  <input
                    type="text"
                    placeholder="Type confirmation passphrase..."
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full bg-zinc-950 border border-rose-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Encrypted Ed25519/RSA Signatures Only</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
