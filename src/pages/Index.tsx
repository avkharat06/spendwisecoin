import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useProfile } from '@/lib/store';
import Dashboard from '@/components/Dashboard';
import AddTransactionModal from '@/components/AddTransactionModal';
import HistoryView from '@/components/HistoryView';
import InsightsView from '@/components/InsightsView';
import DownloadStatementView from '@/components/DownloadStatementView';
import DeletedHistoryView from '@/components/DeletedHistoryView';
import SettingsView from '@/components/SettingsView';
import HelpView from '@/components/HelpView';
import { Plus, Clock, Lightbulb, LogOut, Home, Trash2, Settings, MessageSquare, X, Send, Download, HelpCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type ViewType = 'home' | 'history' | 'insights' | 'filtered' | 'deleted' | 'category' | 'settings' | 'download-statement' | 'help';

const Index = () => {
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const [view, setView] = useState<ViewType>('home');
  const [showAdd, setShowAdd] = useState(false);
  const lastBackPressRef = useRef(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [txFilter, setTxFilter] = useState<'expense' | 'income' | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'upi' | 'cash' | undefined>(undefined);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const { toast } = useToast();

  // Handle mobile back button — navigate back to home instead of exiting
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (showAdd) {
        setShowAdd(false);
        window.history.pushState(null, '', window.location.href);
      } else if (showFeedback) {
        setShowFeedback(false);
        window.history.pushState(null, '', window.location.href);
      } else if (view !== 'home') {
        setView('home');
        window.history.pushState(null, '', window.location.href);
      } else {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          window.removeEventListener('popstate', handlePopState);
          window.history.back();
          return;
        }
        lastBackPressRef.current = now;
        toast({ title: 'Press back again to exit', duration: 2000 });
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Push an initial state so we have something to "go back" to
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [view, showAdd, showFeedback]);

  const handleLogout = async () => {
    await signOut();
  };

  const navigateTo = useCallback((newView: ViewType) => {
    if (newView !== 'home') {
      window.history.pushState(null, '', window.location.href);
    }
    setView(newView);
  }, []);

  const handleFilterView = (filter: 'expense' | 'income' | 'all') => {
    if (filter === 'all') {
      navigateTo('history');
    } else {
      setTxFilter(filter);
      navigateTo('filtered');
    }
  };

  const handleCategoryView = (category: string) => {
    setCategoryFilter(category);
    navigateTo('category');
  };

  const handlePaymentMethodView = (method: 'upi' | 'cash') => {
    setPaymentMethodFilter(method);
    navigateTo('history');
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) {
      toast({ title: 'Please enter your feedback' });
      return;
    }
    setFeedbackText('');
    setShowFeedback(false);
    toast({ title: 'Thanks for your feedback! 💚' });
  };

  const getInitials = () => {
    if (!profile?.display_name) return '?';
    return profile.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const allowReload = view === 'home' || view === 'history' || view === 'settings';

  // Prevent pull-to-refresh on non-allowed views
  useEffect(() => {
    document.documentElement.style.overscrollBehaviorY = allowReload ? 'auto' : 'contain';
    document.body.style.overscrollBehaviorY = allowReload ? 'auto' : 'contain';
    return () => {
      document.documentElement.style.overscrollBehaviorY = 'auto';
      document.body.style.overscrollBehaviorY = 'auto';
    };
  }, [allowReload]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border px-5 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 active:scale-95 transition-all outline-none">
                <Avatar className="h-9 w-9 border-2 border-primary/30">
                  <AvatarImage src={(profile as any)?.avatar_url || undefined} alt="Profile" />
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-bold text-foreground">{profile?.display_name?.split(' ')[0] || 'User'}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-xl border-border/50 bg-card p-1.5">
              <DropdownMenuItem onClick={() => navigateTo('home')} className="rounded-lg py-2.5 px-3 cursor-pointer">
                <Home size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Home</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo('history')} className="rounded-lg py-2.5 px-3 cursor-pointer">
                <Clock size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">History</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo('insights')} className="rounded-lg py-2.5 px-3 cursor-pointer">
                <Lightbulb size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Insights</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo('download-statement')} className="rounded-lg py-2.5 px-3 cursor-pointer">
                <Download size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Download Statement</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo('settings')} className="rounded-lg py-2.5 px-3 cursor-pointer">
                <Settings size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo('deleted')} className="rounded-lg py-2.5 px-3 cursor-pointer">
                <Trash2 size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Deleted History</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateTo('help')} className="rounded-lg py-2.5 px-3 cursor-pointer">
                <HelpCircle size={16} className="mr-2.5 text-muted-foreground" />
                <span className="text-sm font-medium">Help</span>
              </DropdownMenuItem>
                <span className="text-sm font-medium">Deleted History</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="rounded-lg py-2.5 px-3 cursor-pointer text-destructive focus:text-destructive">
                <LogOut size={16} className="mr-2.5" />
                <span className="text-sm font-medium">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button onClick={() => setShowFeedback(true)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            <MessageSquare size={18} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-md mx-auto px-5 py-5 pb-24 space-y-6 animate-fade-in">
        {view === 'home' && <Dashboard onFilterView={handleFilterView} onCategoryView={handleCategoryView} onPaymentMethodView={handlePaymentMethodView} />}
        {view === 'history' && <HistoryView onBack={() => { setPaymentMethodFilter(undefined); setView('home'); }} initialPaymentFilter={paymentMethodFilter} />}
        {view === 'filtered' && <HistoryView filter={txFilter} onBack={() => setView('home')} />}
        {view === 'category' && <HistoryView categoryFilter={categoryFilter} onBack={() => setView('home')} />}
        {view === 'insights' && <InsightsView />}
        {view === 'deleted' && <DeletedHistoryView onBack={() => setView('home')} />}
        {view === 'download-statement' && <DownloadStatementView onBack={() => setView('home')} />}
        {view === 'settings' && <SettingsView onBack={() => setView('home')} />}
        {view === 'help' && <HelpView onBack={() => setView('home')} />}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg active:scale-110 transition-transform"
        style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.4)' }}
      >
        <Plus size={24} />
      </button>

      {showAdd && <AddTransactionModal onClose={() => setShowAdd(false)} />}

      {/* Logout Confirm */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="rounded-2xl border-border/50 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Sign out?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to sign out of SpendWise?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={handleLogout}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFeedback(false)} />
          <div className="relative w-full max-w-lg mx-4 mb-4 sm:mb-0 card-premium rounded-2xl p-6 animate-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} className="text-primary" />
                <h3 className="text-lg font-display font-bold text-foreground">Send Feedback</h3>
              </div>
              <button onClick={() => setShowFeedback(false)} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">We'd love to hear your thoughts, bugs, or feature requests!</p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="Type your feedback here..."
              rows={4}
              className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 resize-none"
            />
            <button
              onClick={handleFeedbackSubmit}
              className="mt-3 w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Send size={16} />
              Submit Feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
