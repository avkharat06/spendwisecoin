import { useState } from 'react';
import { ArrowLeft, User, Settings, Tag, Trash2, ChevronRight } from 'lucide-react';
import ProfileSection from './settings/ProfileSection';
import PreferencesSection from './settings/PreferencesSection';
import CategoriesSection from './settings/CategoriesSection';
import ClearDataSection from './settings/ClearDataSection';

interface SettingsViewProps {
  onBack: () => void;
}

type SettingsScreen = 'home' | 'profile' | 'preferences' | 'categories' | 'clear-data';

const menuItems: { key: SettingsScreen; icon: React.ReactNode; label: string }[] = [
  { key: 'profile', icon: <User size={20} className="text-primary" />, label: 'Profile' },
  { key: 'preferences', icon: <Settings size={20} className="text-primary" />, label: 'Preferences' },
  { key: 'categories', icon: <Tag size={20} className="text-primary" />, label: 'My Categories' },
  { key: 'clear-data', icon: <Trash2 size={20} className="text-destructive" />, label: 'Clear Data' },
];

const SettingsView = ({ onBack }: SettingsViewProps) => {
  const [screen, setScreen] = useState<SettingsScreen>('home');

  if (screen === 'profile') return <ProfileSection onBack={() => setScreen('home')} />;
  if (screen === 'preferences') return <PreferencesSection onBack={() => setScreen('home')} />;
  if (screen === 'categories') return <CategoriesSection onBack={() => setScreen('home')} />;
  if (screen === 'clear-data') return <ClearDataSection onBack={() => setScreen('home')} />;

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground">Settings</h2>
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        {menuItems.map((item, i) => (
          <button
            key={item.key}
            onClick={() => setScreen(item.key)}
            className={`w-full flex items-center gap-4 px-5 py-4 active:scale-[0.98] transition-all hover:bg-secondary/50 ${i < menuItems.length - 1 ? 'border-b border-border' : ''}`}
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              {item.icon}
            </div>
            <span className="flex-1 text-left text-sm font-semibold text-foreground">{item.label}</span>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default SettingsView;
