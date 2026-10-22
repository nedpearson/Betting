import React from 'react';
import { 
  Home, 
  Layers, 
  Star, 
  Briefcase, 
  Menu
} from 'lucide-react';

export type MainTabType = 'decision' | 'markets' | 'watchlist' | 'portfolio' | 'domains' | 'agents' | 'feeds' | 'calibration';

interface MobileNavProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  onOpenMore: () => void;
  opportunitiesCount?: number;
  watchlistCount?: number;
  positionsCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMore,
  opportunitiesCount = 0,
  watchlistCount = 0,
  positionsCount = 0,
}) => {
  const isMoreActive = ['domains', 'agents', 'feeds', 'calibration'].includes(activeTab);

  const primaryTabs = [
    {
      id: 'decision' as const,
      label: 'Home',
      icon: Home,
      badge: opportunitiesCount > 0 ? opportunitiesCount : null,
      isActive: activeTab === 'decision',
      action: () => onSelectTab('decision'),
    },
    {
      id: 'markets' as const,
      label: 'Markets',
      icon: Layers,
      badge: null,
      isActive: activeTab === 'markets',
      action: () => onSelectTab('markets'),
    },
    {
      id: 'watchlist' as const,
      label: 'Watchlist',
      icon: Star,
      badge: watchlistCount > 0 ? watchlistCount : null,
      isActive: activeTab === 'watchlist',
      action: () => onSelectTab('watchlist'),
    },
    {
      id: 'portfolio' as const,
      label: 'Portfolio',
      icon: Briefcase,
      badge: positionsCount > 0 ? positionsCount : null,
      isActive: activeTab === 'portfolio',
      action: () => onSelectTab('portfolio'),
    },
    {
      id: 'more' as const,
      label: 'More',
      icon: Menu,
      badge: null,
      isActive: isMoreActive,
      action: onOpenMore,
    },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d10]/95 backdrop-blur-xl border-t border-zinc-800/90 px-1.5 py-2 flex items-center justify-around shadow-2xl safe-area-bottom">
      {primaryTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.isActive;

        return (
          <button
            key={tab.id}
            onClick={tab.action}
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition relative active:scale-95 cursor-pointer ${
              isActive
                ? 'text-emerald-400 font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition`} />
              {tab.badge !== null && tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 bg-emerald-500 text-zinc-950 text-[9px] font-black rounded-full font-mono shadow-sm">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono mt-1 tracking-tight">
              {tab.label}
            </span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5 shadow-[0_0_6px_#34d399]" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
