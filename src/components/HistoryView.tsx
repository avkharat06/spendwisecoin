import { useState, useMemo } from 'react';
import { getTransactions, deleteTransactions, restoreTransactions, Transaction } from '@/lib/auth';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SwipeableTransaction from './SwipeableTransaction';

interface HistoryViewProps {
  refresh: number;
  onRefresh: () => void;
}

const HistoryView = ({ refresh, onRefresh }: HistoryViewProps) => {
  const transactions = useMemo(() => getTransactions(), [refresh]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectionTotal = useMemo(() => {
    let total = 0;
    transactions.forEach(tx => {
      if (selected.has(tx.id)) {
        total += tx.type === 'income' ? tx.amount : -tx.amount;
      }
    });
    return total;
  }, [selected, transactions]);

  const handleDelete = () => {
    const count = selected.size;
    const deleted = deleteTransactions(Array.from(selected));
    setSelected(new Set());
    onRefresh();
    toast({
      title: `Deleted ${count} transaction(s)`,
      action: (
        <button
          onClick={() => {
            restoreTransactions(deleted);
            onRefresh();
            toast({ title: `Restored ${count} transaction(s)` });
          }}
          className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-xl bg-primary/10 active:scale-95 transition-all"
        >
          Undo
        </button>
      ),
    });
  };

  const handleSingleDelete = (id: string) => {
    const deleted = deleteTransactions([id]);
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    onRefresh();
    toast({
      title: 'Transaction deleted',
      action: (
        <button
          onClick={() => {
            restoreTransactions(deleted);
            onRefresh();
            toast({ title: 'Transaction restored' });
          }}
          className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-xl bg-primary/10 active:scale-95 transition-all"
        >
          Undo
        </button>
      ),
    });
  };

  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(tx => {
      const day = tx.date || new Date(tx.timestamp).toISOString().split('T')[0];
      if (!groups[day]) groups[day] = [];
      groups[day].push(tx);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [transactions]);

  const fmt = (n: number) => '₹' + Math.abs(n).toLocaleString('en-IN');

  return (
    <div className="animate-in pb-4">
      <h2 className="text-2xl font-black text-foreground mb-4">History</h2>

      {/* Selection Summary */}
      {selected.size > 0 && (
        <div className="card-premium flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">{selected.size} selected</p>
            <p className={`text-lg font-black ${selectionTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
              {selectionTotal >= 0 ? '+' : '-'}{fmt(selectionTotal)}
            </p>
          </div>
          <button onClick={handleDelete} className="p-3 rounded-2xl bg-destructive/20 active:scale-95 transition-all">
            <Trash2 size={18} className="text-destructive" />
          </button>
        </div>
      )}

      {grouped.map(([date, txs]) => (
        <div key={date} className="mb-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          <div className="space-y-2">
            {txs.map(tx => {
              const isSelected = selected.has(tx.id);
              return (
                <SwipeableTransaction key={tx.id} onDelete={() => handleSingleDelete(tx.id)}>
                  <div
                    onClick={() => toggle(tx.id)}
                    className={`card-item flex items-center gap-3 cursor-pointer transition-all ${isSelected ? 'border-primary/50' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                      {isSelected && <div className="w-2 h-2 rounded-sm bg-primary-foreground" />}
                    </div>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg" style={{ backgroundColor: tx.categoryColor + '20' }}>
                      {tx.categoryEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{tx.merchant}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                    <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </SwipeableTransaction>
              );
            })}
          </div>
        </div>
      ))}

      {transactions.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-muted-foreground font-medium">No transactions yet</p>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
