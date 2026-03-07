import { useState, useMemo, useRef, useCallback } from 'react';
import { getTransactions, deleteTransactions, restoreTransactions, Transaction, getCurrency } from '@/lib/auth';
import { Trash2, ArrowLeft, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SwipeableTransaction from './SwipeableTransaction';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HistoryViewProps {
  refresh: number;
  onRefresh: () => void;
  filter?: 'expense' | 'income' | 'all';
  categoryFilter?: string;
  onBack?: () => void;
}

const HistoryView = ({ refresh, onRefresh, filter, categoryFilter, onBack }: HistoryViewProps) => {
  const allTransactions = useMemo(() => getTransactions(), [refresh]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const transactions = useMemo(() => {
    let filtered = allTransactions;
    if (filter && filter !== 'all') filtered = filtered.filter(tx => tx.type === filter);
    if (categoryFilter) filtered = filtered.filter(tx => tx.category === categoryFilter);
    if (selectedMonth) {
      filtered = filtered.filter(tx => {
        const d = tx.date || new Date(tx.timestamp).toISOString().split('T')[0];
        return d.startsWith(selectedMonth);
      });
    }
    return filtered;
  }, [allTransactions, filter, categoryFilter, selectedMonth]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const { toast } = useToast();
  const currency = getCurrency();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, []);

  // Get available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allTransactions.forEach(tx => {
      const d = tx.date || new Date(tx.timestamp).toISOString().split('T')[0];
      months.add(d.slice(0, 7)); // YYYY-MM
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [allTransactions]);

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(currency === '₹' ? 'en-IN' : 'en-US', { month: 'short', year: 'numeric' });
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = new Set(transactions.map(tx => tx.id));
    setSelected(allIds);
  };

  const deselectAll = () => setSelected(new Set());

  const allSelected = transactions.length > 0 && transactions.every(tx => selected.has(tx.id));

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
    exitSelectionMode();
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

  const fmt = (n: number) => currency + Math.abs(n).toLocaleString(currency === '₹' ? 'en-IN' : 'en-US');

  const title = categoryFilter ? categoryFilter : filter === 'expense' ? 'Expenses' : filter === 'income' ? 'Income' : 'History';

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-4">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-2xl bg-secondary active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
        )}
        <h2 className="text-2xl font-black text-foreground flex-1">{title}</h2>

        {/* Select All / Deselect - only in selection mode */}
        {selectionMode && (
          <button
            onClick={allSelected ? deselectAll : selectAll}
            className="p-2 rounded-2xl bg-secondary active:scale-95 transition-all"
            title={allSelected ? 'Deselect all' : 'Select all'}
          >
            {allSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-muted-foreground" />}
          </button>
        )}

        {/* Month Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-secondary text-xs font-semibold text-foreground active:scale-95 transition-all">
              {selectedMonth ? formatMonth(selectedMonth) : 'All'}
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-border/50 bg-card p-1.5 max-h-60 overflow-y-auto">
            <DropdownMenuItem
              onClick={() => { setSelectedMonth(null); setSelected(new Set()); }}
              className="rounded-xl py-2.5 px-3 cursor-pointer"
            >
              <span className={`text-sm font-medium ${!selectedMonth ? 'text-primary' : ''}`}>All Months</span>
            </DropdownMenuItem>
            {availableMonths.map(m => (
              <DropdownMenuItem
                key={m}
                onClick={() => { setSelectedMonth(m); setSelected(new Set()); }}
                className="rounded-xl py-2.5 px-3 cursor-pointer"
              >
                <span className={`text-sm font-medium ${selectedMonth === m ? 'text-primary' : ''}`}>{formatMonth(m)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selection Summary */}
      {selected.size > 0 && (
        <div className="sticky top-14 z-20 card-premium flex items-center justify-between mb-4 backdrop-blur-xl">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">{selected.size} selected</p>
            <p className={`text-lg font-black ${selectionTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
              {selectionTotal >= 0 ? '+' : '-'}{fmt(selectionTotal)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={deselectAll} className="p-2.5 rounded-2xl bg-secondary active:scale-95 transition-all">
              <Square size={16} className="text-muted-foreground" />
            </button>
            <button onClick={handleDelete} className="p-3 rounded-2xl bg-destructive/20 active:scale-95 transition-all">
              <Trash2 size={18} className="text-destructive" />
            </button>
          </div>
        </div>
      )}

      {grouped.map(([date, txs]) => (
        <div key={date} className="mb-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
            {new Date(date + 'T00:00:00').toLocaleDateString(currency === '₹' ? 'en-IN' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          <div className="space-y-2">
            {txs.map(tx => {
              const isSelected = selected.has(tx.id);
              const handlePointerDown = () => {
                longPressTriggered.current = false;
                longPressTimer.current = setTimeout(() => {
                  longPressTriggered.current = true;
                  if (!selectionMode) {
                    setSelectionMode(true);
                    setSelected(new Set([tx.id]));
                  }
                }, 500);
              };
              const handlePointerUp = () => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                if (longPressTriggered.current) return;
                if (selectionMode) toggle(tx.id);
              };
              const handlePointerLeave = () => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              };
              return (
                <SwipeableTransaction key={tx.id} onDelete={() => handleSingleDelete(tx.id)}>
                  <div
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    className={`card-item flex items-center gap-3 cursor-pointer transition-all select-none ${isSelected ? 'border-primary/50' : ''}`}
                  >
                    {selectionMode && (
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                        {isSelected && <div className="w-2 h-2 rounded-sm bg-primary-foreground" />}
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg" style={{ backgroundColor: tx.categoryColor + '20' }}>
                      {tx.categoryEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{tx.merchant}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                    <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {tx.type === 'income' ? '+' : '-'}{currency}{tx.amount.toLocaleString(currency === '₹' ? 'en-IN' : 'en-US')}
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
          <p className="text-muted-foreground font-medium">No {filter === 'expense' ? 'expenses' : filter === 'income' ? 'income' : 'transactions'} yet</p>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
