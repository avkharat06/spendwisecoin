import { useMemo } from 'react';
import { getDeletedTransactions, restoreTransactions, permanentlyDeleteFromHistory, DeletedTransaction, getCurrency } from '@/lib/auth';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeletedHistoryViewProps {
  refresh: number;
  onRefresh: () => void;
  onBack?: () => void;
}

const DeletedHistoryView = ({ refresh, onRefresh, onBack }: DeletedHistoryViewProps) => {
  const deletedTxs = useMemo(() => getDeletedTransactions(), [refresh]);
  const { toast } = useToast();
  const currency = getCurrency();

  const handleRestore = (tx: DeletedTransaction) => {
    const { deletedAt, ...original } = tx;
    restoreTransactions([original]);
    onRefresh();
    toast({ title: 'Transaction restored' });
  };

  const handlePermanentDelete = (tx: DeletedTransaction) => {
    permanentlyDeleteFromHistory([tx.id]);
    onRefresh();
    toast({
      title: 'Permanently deleted',
      action: (
        <button
          onClick={() => {
            // Re-add to deleted history by restoring then re-deleting... or just re-insert
            const { deletedAt, ...original } = tx;
            restoreTransactions([original]);
            // Now delete again to put back in deleted history
            const { deleteTransactions } = require('@/lib/auth');
            deleteTransactions([original.id]);
            onRefresh();
            toast({ title: 'Restored to deleted history' });
          }}
          className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-xl bg-primary/10 active:scale-95 transition-all"
        >
          Undo
        </button>
      ),
    });
  };

  const daysLeft = (deletedAt: number) => {
    const ms = deletedAt + 30 * 24 * 60 * 60 * 1000 - Date.now();
    return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString(currency === '₹' ? 'en-IN' : 'en-US', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-4">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-2xl bg-secondary active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
        )}
        <h2 className="text-2xl font-black text-foreground">Deleted History</h2>
      </div>

      <p className="text-xs text-muted-foreground mb-4">Deleted items are kept for 30 days before being permanently removed.</p>

      <div className="space-y-2">
        {deletedTxs.map(tx => (
          <div key={tx.id + tx.deletedAt} className="card-item flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg opacity-60" style={{ backgroundColor: tx.categoryColor + '20' }}>
              {tx.categoryEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate opacity-70">{tx.merchant}</p>
              <p className="text-[10px] text-muted-foreground">
                Deleted {formatDate(tx.deletedAt)} · {daysLeft(tx.deletedAt)}d left
              </p>
            </div>
            <p className={`text-sm font-bold opacity-60 ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
              {tx.type === 'income' ? '+' : '-'}{currency}{tx.amount.toLocaleString(currency === '₹' ? 'en-IN' : 'en-US')}
            </p>
            <div className="flex gap-1">
              <button onClick={() => handleRestore(tx)} className="p-2 rounded-xl bg-primary/10 active:scale-95 transition-all">
                <RotateCcw size={14} className="text-primary" />
              </button>
              <button onClick={() => handlePermanentDelete(tx.id)} className="p-2 rounded-xl bg-destructive/10 active:scale-95 transition-all">
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
