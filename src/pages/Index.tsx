import { useState, useCallback, useEffect } from 'react';
import { getActiveUser, signOut, seedSampleData, getCurrency, setCurrency as setCurrencyPref } from '@/lib/auth';
import AuthScreen from '@/components/AuthScreen';
import Dashboard from '@/components/Dashboard';
import AddTransactionModal from '@/components/AddTransactionModal';
import HistoryView from '@/components/HistoryView';
import InsightsView from '@/components/InsightsView';
import DeletedHistoryView from '@/components/DeletedHistoryView';
import { Plus, Clock, Lightbulb, LogOut, DollarSign, Home, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ViewType = 'home' | 'history' | 'insights' | 'filtered' | 'deleted';

const Index = () => {
  const [authed, setAuthed] = useState(!!getActiveUser());
  const [view, setView] = useState<ViewType>('home');
  const [showAdd, setShowAdd] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [txFilter, setTxFilter] = useState<'expense' | 'income' | 'all'>('all');
  const [currency, setCurrencyState] = useState(getCurrency());

  const triggerRefresh = useCallback(() => setRefresh(r => r + 1), []);
  const user = getActiveUser();

  // Seed sample data on first login
  useEffect(() => {
    if (authed) {
      seedSampleData();
      triggerRefresh();
    }
  }, [authed]);

  const handleLogout = () => {
    signOut();
    setAuthed(false);
  };

  const toggleCurrency = () => {
    const next = currency === '₹' ? '$' : '₹';
    setCurrencyPref(next);
    setCurrencyState(next);
    triggerRefresh();
  };

  const handleFilterView = (filter: 'expense' | 'income' | 'all') => {
    if (filter === 'all') {
      setView('history');
    } else {
      setTxFilter(filter);
      setView('filtered');
    }
  };

  const getInitials = () => {
    if (!user?.name) return '?';
    return user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen relative">
      <div className="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none overflow-hidden" style={{ background: 'var(--gradient-glow-primary)' }} />
      <div className="fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full pointer-events-none overflow-hidden" style={{ background: 'var(--gradient-glow-accent)' }} />

      {/* Header */}
      <div className="sticky top-0 z-30 glass-strong">
        <div className="max-w-lg mx-auto flex items-center justify-between px-5 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 active:scale-95 transition-all outline-none">
                <Avatar className="h-9 w-9 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-bold text-foreground">{user?.name?.split(' ')[0]}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-2xl border-border/50 bg-card p-1.5">
              <DropdownMenuItem onClick={() => setView('home')} className="rounded-xl py-2.5 px-3 cursor-pointer">
                <Home size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Home</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('history')} className="rounded-xl py-2.5 px-3 cursor-pointer">
                <Clock size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">History</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('insights')} className="rounded-xl py-2.5 px-3 cursor-pointer">
                <Lightbulb size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Insights</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleCurrency} className="rounded-xl py-2.5 px-3 cursor-pointer">
                <DollarSign size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Currency: {currency}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('deleted')} className="rounded-xl py-2.5 px-3 cursor-pointer">
                <Trash2 size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Deleted History</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="rounded-xl py-2.5 px-3 cursor-pointer text-destructive focus:text-destructive">
                <LogOut size={16} className="mr-2.5" />
                <span className="text-sm font-medium">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <h1 className="text-lg font-black text-gradient">SpendWise</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-5 pt-4 pb-24" key={`${view}-${refresh}`}>
        {view === 'home' && <Dashboard onFilterView={handleFilterView} />}
        {view === 'history' && <HistoryView refresh={refresh} onRefresh={triggerRefresh} onBack={() => setView('home')} />}
        {view === 'filtered' && <HistoryView refresh={refresh} onRefresh={triggerRefresh} filter={txFilter} onBack={() => setView('home')} />}
        {view === 'insights' && <InsightsView />}
        {view === 'deleted' && <DeletedHistoryView refresh={refresh} onRefresh={triggerRefresh} onBack={() => setView('home')} />}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-8 right-5 z-50 w-14 h-14 rounded-full gradient-primary glow-primary flex items-center justify-center active:scale-90 transition-all shadow-2xl"
      >
        <Plus size={24} className="text-primary-foreground" />
      </button>

      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} onAdded={triggerRefresh} />}

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="rounded-3xl border-border/50 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to sign out of SpendWise?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl bg-destructive hover:bg-destructive/90" onClick={handleLogout}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
