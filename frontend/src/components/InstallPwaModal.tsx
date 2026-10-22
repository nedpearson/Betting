import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Share, 
  PlusSquare, 
  Smartphone, 
  CheckCircle2, 
  X, 
  Sparkles,
  Zap,
  Bell
} from 'lucide-react';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
}) => {
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect if already installed / standalone
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      setInstalling(false);
      if (choiceResult.outcome === 'accepted') {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1013] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/40">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                Progressive Web App
              </span>
              <h3 className="text-lg font-black text-white tracking-tight">
                Install Betting Intelligence OS
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits List */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Full-screen app mode with no browser URL bar</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Instant launch from iPhone or Android Home Screen</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sub-second biometric &amp; persistent session access</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Real-time trade push alerts and offline protection</span>
          </div>
        </div>

        {/* Installation Instructions based on Platform */}
        {isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs text-center">
            ✓ Application is already running in standalone Home Screen mode!
          </div>
        ) : isIOS ? (
          <div className="space-y-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-xs">
            <div className="font-bold text-white flex items-center gap-2">
              <span>Apple iPhone &amp; iPad Instructions:</span>
            </div>
            <ol className="space-y-2.5 text-zinc-300 font-mono list-decimal list-inside">
              <li className="leading-relaxed">
                Tap the <strong className="text-sky-400">Share</strong> icon in Safari&#39;s bottom toolbar (<Share className="inline w-3.5 h-3.5 mx-1" />).
              </li>
              <li className="leading-relaxed">
                Scroll down and tap <strong className="text-emerald-400">&quot;Add to Home Screen&quot;</strong> (<PlusSquare className="inline w-3.5 h-3.5 mx-1" />).
              </li>
              <li className="leading-relaxed">
                Tap <strong className="text-white">Add</strong> in the top-right corner.
              </li>
            </ol>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm font-mono tracking-wider transition active:scale-95 shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>{installing ? 'INSTALLING...' : 'INSTALL TO HOME SCREEN'}</span>
          </button>
        ) : (
          <div className="space-y-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-xs font-mono text-zinc-300">
            <p>
              To install, open your browser menu (<span className="text-white font-bold">⋮</span> or <span className="text-white font-bold">Share</span>) and select <strong className="text-emerald-400">&quot;Install app&quot;</strong> or <strong className="text-emerald-400">&quot;Add to Home Screen&quot;</strong>.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-mono transition"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
