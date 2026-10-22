import React from 'react';
import { 
  Bot, 
  Globe, 
  Target, 
  Activity, 
  ShieldAlert, 
  Settings, 
  Download, 
  X, 
  Briefcase,
  History,
  TrendingUp,
  Sliders,
  Bell
} from 'lucide-react';

interface MobileMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: any) => void;
  onOpenAccount: () => void;
  onOpenInstall: () => void;
  onTriggerKillSwitch: () => void;
  isHalted: boolean;
  isKalshiConnected: boolean;
}

export const MobileMoreModal: React.FC<MobileMoreModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenAccount,
  onOpenInstall,
  onTriggerKillSwitch,
  isHalted,
  isKalshiConnected,
}) => {
  if (!isOpen) return null;

  const navigateTo = (tab: any) => {
    onSelectTab(tab);
    onClose();
  };

  const menuSections = [
    {
      title: 'Advanced Analytics & Intelligence',
      items: [
        {
          id: 'agents',
          label: 'AI Agents Command Center',
          desc: '16 specialized quantitative agents & operational state',
          icon: Bot,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          action: () => navigateTo('agents'),
        },
        {
          id: 'domains',
          label: 'Forensic Domain Intel',
          desc: 'Weather ensembles, Sports drift diffusion, Crypto EWMA',
          icon: Globe,
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
          action: () => navigateTo('domains'),
        },
        {
          id: 'calibration',
          label: 'Model Accuracy & Brier Score',
          desc: 'Out-of-sample calibration audit, ECE & reliability curves',
          icon: Target,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
          action: () => navigateTo('calibration'),
        },
        {
          id: 'feeds',
          label: 'Data Feeds & Connectivity',
          desc: 'Kalshi REST/WS, Open-Meteo, Coinbase & NOAA streams',
          icon: Activity,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          action: () => navigateTo('feeds'),
        },
      ],
    },
    {
      title: 'Risk & Capital Operations',
      items: [
        {
          id: 'account',
          label: 'Kalshi Account & Shards',
          desc: isKalshiConnected ? 'Connected to Kalshi Exchange' : 'Authenticate API keys',
          icon: Settings,
          color: isKalshiConnected
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          action: () => {
            onOpenAccount();
            onClose();
          },
        },
        {
          id: 'risk',
          label: isHalted ? 'Emergency Safety Halt Active' : 'Emergency Kill Switch',
          desc: isHalted ? 'All trading paused. Tap to review' : 'Immediately halt all automated orders',
          icon: ShieldAlert,
          color: isHalted
            ? 'text-rose-400 bg-rose-500/20 border-rose-500/40'
            : 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          action: () => {
            onTriggerKillSwitch();
            onClose();
          },
        },
        {
          id: 'install',
          label: 'Install App (PWA)',
          desc: 'Add to iPhone or Android Home Screen for fullscreen operation',
          icon: Download,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          action: () => {
            onOpenInstall();
            onClose();
          },
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1013] border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-6 animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
              Menu &amp; Tools
            </span>
            <h3 className="text-xl font-black text-white tracking-tight">
              All Analytical Features
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sections */}
        {menuSections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-2.5">
            <h4 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider px-1">
              {sec.title}
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#0e1417] hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition active:scale-98 group cursor-pointer"
                  >
                    <div className={`p-2.5 rounded-xl border shrink-0 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition truncate">
                        {item.label}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono truncate">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
