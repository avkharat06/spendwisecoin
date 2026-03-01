import { useState, useCallback } from 'react';
import { getActiveUser, signOut } from '@/lib/auth';
import AuthScreen from '@/components/AuthScreen';
import Dashboard from '@/components/Dashboard';
import BottomNav, { TabType } from '@/components/BottomNav';
import AddTransactionModal from '@/components/AddTransactionModal';
import HistoryView from '@/components/HistoryView';
import InsightsView from '@/components/InsightsView';
import { Plus, LogOut } from 'lucide-react';

const Index = () => {
  const [authed, setAuthed] = useState(!!getActiveUser());
  const [tab, setTab] = useState<TabType>('home');
  const [showAdd, setShowAdd] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const triggerRefresh = useCallback(() => setRefresh(r => r + 1), []);

  const handleLogout = () => {
    signOut();
    setAuthed(false);
  };

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background glows */}
      <div className="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none" style={{ background: 'var(--gradient-glow-primary)' }} />
      <div className="fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full pointer-events-none" style={{ background: 'var(--gradient-glow-accent)' }} />

      {/* Header */}
      <div className="sticky top-0 z-30 glass-strong">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-3">
          <h1 className="text-lg font-black text-gradient">SpendWise</h1>
          <button onClick={handleLogout} className="p-2 rounded-2xl bg-secondary active:scale-95 transition-all">
            <LogOut size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 pt-4 pb-24" key={`${tab}-${refresh}`}>
        {tab === 'home' && <Dashboard />}
        {tab === 'history' && <HistoryView refresh={refresh} onRefresh={triggerRefresh} />}
        {tab === 'insights' && <InsightsView />}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-5 z-50 w-14 h-14 rounded-full gradient-primary glow-primary flex items-center justify-center active:scale-90 transition-all shadow-2xl"
      >
        <Plus size={24} className="text-primary-foreground" />
      </button>

      <BottomNav active={tab} onTabChange={setTab} />

      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} onAdded={triggerRefresh} />}
    </div>
  );
};

export default Index;
