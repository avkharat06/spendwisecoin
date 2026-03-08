import { useDeletedTransactions, useRestoreTransactions, usePermanentDeleteTransactions, useProfile } from '@/lib/store';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeletedHistoryViewProps {
  onBack?: () => void;
}

const DeletedHistoryView = ({ onBack }: DeletedHistoryViewProps) => {
  const { data: deletedTxs = [] } = useDeletedTransactions();
  const { data: profile } = useProfile();
  const currency = profile?.currency || '₹';
  const { toast } = useToast();
  const restoreMut = useRestoreTransactions();
  const permDelete = usePermanentDeleteTransactions();

  const handleRestore = async (id: string) => {
    await restoreMut.mutateAsync([id]);
    toast({ title: 'Transaction restored' });
  };

  const handlePermanentDelete = async (id: string) => {
    await permDelete.mutateAsync([id]);
    toast({ title: 'Permanently deleted' });
  };

  const daysLeft = (deletedAt: string) => {
    const ms = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
    return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  };

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString(currency === '₹' ? 'en-IN' : 'en-US', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-4">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
        )}
        <h2 className="text-2xl font-display font-bold text-foreground">Deleted History</h2>
      </div>

      <p className="text-xs text-muted-foreground mb-4">Deleted items are kept for 30 days before being permanently removed.</p>

      <div className="space-y-2">
        {deletedTxs.map(tx => (
          <div key={tx.id} className="card-item flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg opacity-60" style={{ backgroundColor: tx.category_color + '20' }}>
              {tx.category_emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate opacity-70">{tx.merchant}</p>
              <p className="text-[10px] text-muted-foreground">
                Deleted {formatDate(tx.deleted_at!)} · {daysLeft(tx.deleted_at!)}d left
              </p>
            </div>
            <p className={`text-sm font-display font-bold opacity-60 ${tx.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
              {tx.type === 'income' ? '+' : '-'}{currency}{tx.amount.toLocaleString(currency === '₹' ? 'en-IN' : 'en-US')}
            </p>
            <div className="flex gap-1">
              <button onClick={() => handleRestore(tx.id)} className="p-2 rounded-lg bg-primary/10 active:scale-95 transition-all">
                <RotateCcw size={14} className="text-primary" />
              </button>
              <button onClick={() => handlePermanentDelete(tx.id)} className="p-2 rounded-lg bg-destructive/10 active:scale-95 transition-all">
                <Trash2 size={14} className="text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {deletedTxs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗑️</p>
          <p className="text-muted-foreground font-medium">No deleted transactions</p>
        </div>
      )}
    </div>
  );
};

export default DeletedHistoryView;
