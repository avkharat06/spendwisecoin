import { useState } from 'react';
import { useUpdateProfile } from '@/lib/store';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ClearDataSectionProps {
  onBack: () => void;
}

const ClearDataSection = ({ onBack }: ClearDataSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const [clearTarget, setClearTarget] = useState<'transactions' | 'categories' | 'all' | null>(null);
  const [clearing, setClearing] = useState(false);

  const handleClearData = async () => {
    if (!clearTarget || !user) return;
    setClearing(true);
    try {
      if (clearTarget === 'transactions' || clearTarget === 'all') {
        const { error } = await supabase.from('transactions').delete().eq('user_id', user.id);
        if (error) throw error;
      }
      if (clearTarget === 'categories' || clearTarget === 'all') {
        const { error } = await supabase.from('custom_categories').delete().eq('user_id', user.id);
        if (error) throw error;
      }
      if (clearTarget === 'all') {
        await updateProfile.mutateAsync({ monthly_budget: 0, budget_enabled: true, show_recent_activity: true, show_running_balance: true });
      }
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: clearTarget === 'transactions' ? 'All transactions cleared! 🗑️' : clearTarget === 'categories' ? 'Custom categories cleared! 🗑️' : 'All data reset! 🗑️' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setClearing(false);
      setClearTarget(null);
    }
  };

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground">Clear Data</h2>
      </div>

      <div className="rounded-xl bg-card p-5 border border-border" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Trash2 size={18} className="text-destructive" />
          <h3 className="text-sm font-display font-semibold text-foreground uppercase tracking-widest">Clear Data</h3>
        </div>
        <div className="space-y-2">
          <button onClick={() => setClearTarget('transactions')} className="w-full py-3 rounded-xl bg-secondary text-sm font-medium text-foreground flex items-center justify-center gap-2 active:scale-95 transition-all">
            🗑️ Clear All Transactions
          </button>
          <button onClick={() => setClearTarget('categories')} className="w-full py-3 rounded-xl bg-secondary text-sm font-medium text-foreground flex items-center justify-center gap-2 active:scale-95 transition-all">
            🏷️ Clear Custom Categories
          </button>
          <button onClick={() => setClearTarget('all')} className="w-full py-3 rounded-xl bg-destructive/10 text-sm font-bold text-destructive flex items-center justify-center gap-2 active:scale-95 transition-all">
            ⚠️ Reset All Data
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">This action cannot be undone</p>
      </div>

      <AlertDialog open={!!clearTarget} onOpenChange={open => { if (!open) setClearTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {clearTarget === 'transactions' ? 'Clear All Transactions?' : clearTarget === 'categories' ? 'Clear Custom Categories?' : 'Reset All Data?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clearTarget === 'transactions' ? 'This will permanently delete all your transactions. This cannot be undone.'
                : clearTarget === 'categories' ? 'This will remove all your custom categories. Default categories will remain.'
                : 'This will delete all transactions, custom categories, and reset settings to defaults. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData} disabled={clearing} className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {clearing ? 'Clearing...' : 'Yes, Clear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClearDataSection;
