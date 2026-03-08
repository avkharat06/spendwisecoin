import { useState, useMemo, useRef, useCallback } from 'react';
import { useTransactions, useSoftDeleteTransactions, useRestoreTransactions, useProfile } from '@/lib/store';
import { Trash2, ArrowLeft, CheckSquare, Square, ChevronDown, X, Pencil, Smartphone, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SwipeableTransaction from './SwipeableTransaction';
import EditTransactionModal from './EditTransactionModal';
import TransactionDetailModal from './TransactionDetailModal';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface HistoryViewProps {
  filter?: 'expense' | 'income' | 'all';
  categoryFilter?: string;
  initialPaymentFilter?: 'upi' | 'cash';
  onBack?: () => void;
}

const HistoryView = ({ filter, categoryFilter, initialPaymentFilter, onBack }: HistoryViewProps) => {
  const { data: allTransactions = [] } = useTransactions();
  const { data: profile } = useProfile();
  const currency = profile?.currency || '₹';
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'upi' | 'cash'>(initialPaymentFilter || 'all');
  const softDelete = useSoftDeleteTransactions();
  const restore = useRestoreTransactions();
  const [editingTx, setEditingTx] = useState<typeof allTransactions[0] | null>(null);
  const [viewingTx, setViewingTx] = useState<typeof allTransactions[0] | null>(null);

  const transactions = useMemo(() => {
    let filtered = allTransactions;
    if (filter && filter !== 'all') filtered = filtered.filter(tx => tx.type === filter);
    if (categoryFilter) filtered = filtered.filter(tx => tx.category === categoryFilter);
    if (selectedMonth) filtered = filtered.filter(tx => tx.date.startsWith(selectedMonth));
    if (paymentFilter !== 'all') filtered = filtered.filter(tx => (tx as any).payment_method === paymentFilter);
    return filtered;
  }, [allTransactions, filter, categoryFilter, selectedMonth, paymentFilter]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const { toast } = useToast();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, []);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allTransactions.forEach(tx => months.add(tx.date.slice(0, 7)));
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

  const selectAll = () => setSelected(new Set(transactions.map(tx => tx.id)));
  const deselectAll = () => setSelected(new Set());
  const allSelected = transactions.length > 0 && transactions.every(tx => selected.has(tx.id));

  const selectionTotal = useMemo(() => {
    let total = 0;
    transactions.forEach(tx => {
      if (selected.has(tx.id)) total += tx.type === 'income' ? tx.amount : -tx.amount;
    });
    return total;
  }, [selected, transactions]);

  const handleDelete = async () => {
    const count = selected.size;
    const ids = Array.from(selected);
    await softDelete.mutateAsync(ids);
    exitSelectionMode();
    toast({
      title: `Deleted ${count} transaction(s)`,
      action: (
        <button onClick={async () => { await restore.mutateAsync(ids); toast({ title: `Restored ${count} transaction(s)` }); }}
          className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-xl bg-primary/10 active:scale-95 transition-all">
          Undo
        </button>
      ),
    });
  };

  const handleSingleDelete = async (id: string) => {
    await softDelete.mutateAsync([id]);
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    toast({
      title: 'Transaction deleted',
      action: (
        <button onClick={async () => { await restore.mutateAsync([id]); toast({ title: 'Transaction restored' }); }}
          className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-xl bg-primary/10 active:scale-95 transition-all">
          Undo
        </button>
      ),
    });
  };

  // Pie chart data
  const pieData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped: Record<string, { amount: number; emoji: string; color: string }> = {};
    expenses.forEach(tx => {
      if (!grouped[tx.category]) grouped[tx.category] = { amount: 0, emoji: tx.category_emoji, color: tx.category_color };
      grouped[tx.category].amount += tx.amount;
    });
    return Object.entries(grouped)
      .map(([name, d]) => ({ name, value: d.amount, color: d.color, emoji: d.emoji }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalExpense = pieData.reduce((s, d) => s + d.value, 0);
  const topCategory = pieData[0];

  const grouped = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    transactions.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [transactions]);

  const fmt = (n: number) => currency + Math.abs(n).toLocaleString(currency === '₹' ? 'en-IN' : 'en-US');

  const title = categoryFilter ? categoryFilter : filter === 'expense' ? 'Expenses' : filter === 'income' ? 'Income' : 'History';

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-4">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
        )}
        <h2 className="text-2xl font-display font-bold text-foreground flex-1">{title}</h2>

        {selectionMode && (
          <button onClick={allSelected ? deselectAll : selectAll} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
            {allSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} className="text-muted-foreground" />}
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground active:scale-95 transition-all">
              {selectedMonth ? formatMonth(selectedMonth) : 'All'}
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-border/50 bg-card p-1.5 max-h-60 overflow-y-auto">
            <DropdownMenuItem onClick={() => { setSelectedMonth(null); setSelected(new Set()); }} className="rounded-lg py-2.5 px-3 cursor-pointer">
              <span className={`text-sm font-medium ${!selectedMonth ? 'text-primary' : ''}`}>All Months</span>
            </DropdownMenuItem>
            {availableMonths.map(m => (
              <DropdownMenuItem key={m} onClick={() => { setSelectedMonth(m); setSelected(new Set()); }} className="rounded-lg py-2.5 px-3 cursor-pointer">
                <span className={`text-sm font-medium ${selectedMonth === m ? 'text-primary' : ''}`}>{formatMonth(m)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary text-xs font-semibold text-foreground active:scale-95 transition-all">
              {paymentFilter === 'upi' ? '💳 UPI' : paymentFilter === 'cash' ? '💵 Cash' : '💳 All'}
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-border/50 bg-card p-1.5">
            <DropdownMenuItem onClick={() => setPaymentFilter('all')} className="rounded-lg py-2.5 px-3 cursor-pointer">
              <span className={`text-sm font-medium ${paymentFilter === 'all' ? 'text-primary' : ''}`}>All Methods</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPaymentFilter('upi')} className="rounded-lg py-2.5 px-3 cursor-pointer">
              <span className={`text-sm font-medium ${paymentFilter === 'upi' ? 'text-primary' : ''}`}>💳 UPI</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPaymentFilter('cash')} className="rounded-lg py-2.5 px-3 cursor-pointer">
              <span className={`text-sm font-medium ${paymentFilter === 'cash' ? 'text-primary' : ''}`}>💵 Cash</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Pie Chart Breakdown */}
      {pieData.length > 0 && !categoryFilter && (
        <div className="card-premium mb-4">
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-3">Monthly Breakdown</h3>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold text-foreground">{d.emoji} {d.name}</p>
                          <p className="text-muted-foreground">{fmt(d.value)}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {pieData.slice(0, 5).map(d => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-foreground">{d.name}</span>
                  </div>
                  <span className="text-muted-foreground font-display font-semibold">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
          {topCategory && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-primary/10 text-xs text-primary font-medium flex items-center gap-1.5">
              💡 You spent the most on <strong>{topCategory.name}</strong> — {fmt(topCategory.value)}
            </div>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="sticky top-14 z-20 card-premium flex items-center justify-between mb-4 backdrop-blur-xl">
          <div>
            <p className="text-xs text-muted-foreground font-semibold">{selected.size} selected</p>
            <p className={`text-lg font-display font-bold ${selectionTotal >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {selectionTotal >= 0 ? '+' : '-'}{fmt(selectionTotal)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exitSelectionMode} className="p-2.5 rounded-xl bg-secondary active:scale-95 transition-all">
              <X size={16} className="text-muted-foreground" />
            </button>
            <button onClick={handleDelete} className="p-3 rounded-xl bg-destructive/20 active:scale-95 transition-all">
              <Trash2 size={18} className="text-destructive" />
            </button>
          </div>
        </div>
      )}

      {grouped.map(([date, txs]) => {
        const dateIds = txs.map(tx => tx.id);
        const allDateSelected = dateIds.length > 0 && dateIds.every(id => selected.has(id));
        const dateExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const dateIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const toggleDate = () => {
          setSelected(prev => {
            const next = new Set(prev);
            if (allDateSelected) dateIds.forEach(id => next.delete(id));
            else dateIds.forEach(id => next.add(id));
            return next;
          });
        };
        return (
        <div key={date} className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {selectionMode && (
                <button onClick={toggleDate} className="active:scale-90 transition-all">
                  <div className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-all ${allDateSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                    {allDateSelected && <div className="w-1.5 h-1.5 rounded-sm bg-primary-foreground" />}
                  </div>
                </button>
              )}
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {new Date(date + 'T00:00:00').toLocaleDateString(currency === '₹' ? 'en-IN' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            {selectionMode && (
              <div className="flex items-center gap-2 text-[10px] font-display font-bold">
                {dateExpense > 0 && <span className="text-destructive">-{currency}{dateExpense.toLocaleString(currency === '₹' ? 'en-IN' : 'en-US')}</span>}
                {dateIncome > 0 && <span className="text-green-400">+{currency}{dateIncome.toLocaleString(currency === '₹' ? 'en-IN' : 'en-US')}</span>}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {txs.map(tx => {
              const isSelected = selected.has(tx.id);
              const handlePointerDown = () => {
                longPressTriggered.current = false;
                longPressTimer.current = setTimeout(() => {
                  longPressTriggered.current = true;
                  if (!selectionMode) { setSelectionMode(true); setSelected(new Set([tx.id])); }
                }, 500);
              };
              const handlePointerUp = () => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                if (longPressTriggered.current) return;
                if (selectionMode) toggle(tx.id);
                else setViewingTx(tx);
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
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                        {isSelected && <div className="w-2 h-2 rounded-sm bg-primary-foreground" />}
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: tx.category_color + '20' }}>
                      {tx.category_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.merchant}</p>
                      <p className="text-xs text-muted-foreground">{tx.category}</p>
                    </div>
                    <p className={`text-sm font-display font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-destructive'}`}>
                      {tx.payment_method === 'upi' ? '💳' : '💵'} {tx.type === 'income' ? '+' : '-'}{currency}{tx.amount.toLocaleString(currency === '₹' ? 'en-IN' : 'en-US')}
                    </p>
                    {!selectionMode && (
                      <button
                        onPointerDown={e => e.stopPropagation()}
                        onPointerUp={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); setEditingTx(tx); }}
                        className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary active:scale-95 transition-all ml-1"
                      >
                        <Pencil size={14} className="text-muted-foreground" />
                      </button>
                    )}
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

      {viewingTx && (
        <TransactionDetailModal
          transaction={viewingTx}
          onClose={() => setViewingTx(null)}
          onEdit={() => { setEditingTx(viewingTx); setViewingTx(null); }}
        />
      )}
      {editingTx && <EditTransactionModal transaction={editingTx} onClose={() => setEditingTx(null)} />}
    </div>
  );
};

export default HistoryView;
