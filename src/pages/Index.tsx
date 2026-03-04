import { useState, useCallback } from 'react';
import { getActiveUser, signOut } from '@/lib/auth';
import AuthScreen from '@/components/AuthScreen';
import Dashboard from '@/components/Dashboard';
import BottomNav, { TabType } from '@/components/BottomNav';
import AddTransactionModal from '@/components/AddTransactionModal';
import HistoryView from '@/components/HistoryView';
import InsightsView from '@/components/InsightsView';
import { Plus, Clock, Lightbulb, LogOut } from 'lucide-react';
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

const Index = () => {
  const [authed, setAuthed] = useState(!!getActiveUser());
  const [tab, setTab] = useState<TabType>('home');
  const [showAdd, setShowAdd] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const triggerRefresh = useCallback(() => setRefresh(r => r + 1), []);
  const user = getActiveUser();

  const handleLogout = () => {
    signOut();
    setAuthed(false);
  };

  const getInitials = () => {
    if (!user?.name) return '?';
    return user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!authed) return <AuthScreen onAuth={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none" style={{ background: 'var(--gradient-glow-primary)' }} />
      <div className="fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full pointer-events-none" style={{ background: 'var(--gradient-glow-accent)' }} />

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
              <DropdownMenuItem onClick={() => setTab('history')} className="rounded-xl py-2.5 px-3 cursor-pointer">
                <Clock size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">History</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTab('insights')} className="rounded-xl py-2.5 px-3 cursor-pointer">
                <Lightbulb size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Insights</span>
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

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="rounded-3xl border-white/10 bg-card">
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
