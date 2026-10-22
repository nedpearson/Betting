import React from 'react';
import { 
  Compass, 
  Layers, 
  Globe, 
  Bot, 
  Briefcase, 
  Activity,
  Target
} from 'lucide-react';

interface MobileNavProps {
  activeTab: 'decision' | 'markets' | 'domains' | 'agents' | 'portfolio' | 'feeds' | 'calibration';
  onSelectTab: (tab: 'decision' | 'markets' | 'domains' | 'agents' | 'portfolio' | 'feeds' | 'calibration') => void;
  opportunitiesCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  opportunitiesCount = 0,
}) => {
  const tabs = [
    {
      id: 'decision' as const,
      label: 'Decision',
      icon: Compass,
      badge: opportunitiesCount > 0 ? opportunitiesCount : null,
    },
    {
      id: 'markets' as const,
      label: 'Markets',
      icon: Layers,
    },
    {
      id: 'domains' as const,
      label: 'Intel',
      icon: Globe,
    },
    {
      id: 'agents' as const,
      label: 'Agents',
      icon: Bot,
    },
    {
      id: 'portfolio' as const,
      label: 'Portfolio',
      icon: Briefcase,
    },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d10]/95 backdrop-blur-xl border-t border-zinc-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition relative active:scale-95 ${
              isActive
                ? 'text-emerald-400 font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition`} />
              {tab.badge && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-emerald-500 text-zinc-950 text-[9px] font-bold rounded-full font-mono">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono mt-0.5 tracking-tight">
              {tab.label}
            </span>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
