import { Home, Clock, Lightbulb } from 'lucide-react';

export type TabType = 'home' | 'history' | 'insights';

interface BottomNavProps {
  active: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'history', icon: Clock, label: 'History' },
  { id: 'insights', icon: Lightbulb, label: 'Insights' },
];

const BottomNav = ({ active, onTabChange }: BottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-border/30">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(tab => {
          const isActive = active === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 py-2 px-4 active:scale-95 transition-all"
            >
              <Icon
                size={22}
                className={`transition-all ${isActive ? 'text-primary scale-110' : 'text-muted-foreground'}`}
              />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary animate-pulse-dot mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
