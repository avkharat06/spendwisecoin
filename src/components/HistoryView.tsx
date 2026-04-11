import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTransactions, useSoftDeleteTransactions, useRestoreTransactions, useProfile } from '@/lib/store';
import { Trash2, ArrowLeft, CheckSquare, Square, ChevronDown, X, Pencil, Search, SlidersHorizontal, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SmartAmount, abbreviateNumber } from '@/lib/format-amount';
import { format, parseISO } from 'date-fns';

import EditTransactionModal from './EditTransactionModal';
import TransactionDetailModal from './TransactionDetailModal';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  const locale = currency === '₹' ? 'en-IN' : 'en-US';
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'upi' | 'cash'>(initialPaymentFilter || 'all');
  const softDelete = useSoftDeleteTransactions();
  const restore = useRestoreTransactions();
  const [editingTx, setEditingTx] = useState<typeof allTransactions[0] | null>(null);
  const [viewingTx, setViewingTx] = useState<typeof allTransactions[0] | null>(null);

  // Search & filter state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterPayment, setFilterPayment] = useState<'all' | 'upi' | 'cash'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);
  const [balanceTab, setBalanceTab] = useState<'total' | 'cash' | 'upi'>('total');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Get all unique categories for filter
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    allTransactions.forEach(tx => cats.add(tx.category));
    return Array.from(cats).sort();
  }, [allTransactions]);

  const hasActiveFilters = filterType !== 'all' || filterCategory !== null || filterPayment !== 'all' || !!filterDateFrom || !!filterDateTo;

  const clearAllFilters = () => {
    setFilterType('all');
    setFilterCategory(null);
    setFilterPayment('all');
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
  };

  const transactions = useMemo(() => {
    let filtered = allTransactions;
    if (filter && filter !== 'all') filtered = filtered.filter(tx => tx.type === filter);
    if (categoryFilter) filtered = filtered.filter(tx => tx.category === categoryFilter);
    if (selectedMonth) filtered = filtered.filter(tx => tx.date.startsWith(selectedMonth));
    if (paymentFilter !== 'all') filtered = filtered.filter(tx => (tx as any).payment_method === paymentFilter);

    // Apply search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      filtered = filtered.filter(tx =>
        tx.merchant.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.amount.toString().includes(q)
      );
    }

    // Apply filter sheet filters
    if (filterType !== 'all') filtered = filtered.filter(tx => tx.type === filterType);
    if (filterCategory) filtered = filtered.filter(tx => tx.category === filterCategory);
    if (filterPayment !== 'all') filtered = filtered.filter(tx => (tx as any).payment_method === filterPayment);

    // Date range filter
    if (filterDateFrom) {
      filtered = filtered.filter(tx => parseISO(tx.date) >= filterDateFrom);
    }
    if (filterDateTo) {
      const end = new Date(filterDateTo);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(tx => parseISO(tx.date) <= end);
    }

    return filtered;
  }, [allTransactions, filter, categoryFilter, selectedMonth, paymentFilter, debouncedSearch, filterType, filterCategory, filterPayment, filterDateFrom, filterDateTo]);

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
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(locale, { month: 'short', year: 'numeric' });
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

  const balanceStats = useMemo(() => {
    let cashIncome = 0, cashExpense = 0, upiIncome = 0, upiExpense = 0;
    let totalIncome = 0, totalExpense = 0;
    transactions.forEach(tx => {
      const pm = (tx as any).payment_method || 'cash';
      if (tx.type === 'income') {
        totalIncome += tx.amount;
        if (pm === 'cash') cashIncome += tx.amount; else upiIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
        if (pm === 'cash') cashExpense += tx.amount; else upiExpense += tx.amount;
      }
    });
    return {
      cashBalance: cashIncome - cashExpense,
      upiBalance: upiIncome - upiExpense,
      totalIncome,
      totalExpense,
      totalBalance: totalIncome - totalExpense,
    };
  }, [transactions]);

  const cashBalance = balanceStats.cashBalance;
  const upiBalance = balanceStats.upiBalance;

  const activeBalance = balanceTab === 'cash' ? cashBalance : balanceTab === 'upi' ? upiBalance : balanceStats.totalBalance;
  const activeIncome = useMemo(() => {
    if (balanceTab === 'total') return balanceStats.totalIncome;
    let inc = 0;
    transactions.forEach(tx => {
      if (tx.type === 'income' && ((tx as any).payment_method || 'cash') === balanceTab) inc += tx.amount;
    });
    return inc;
  }, [transactions, balanceTab, balanceStats.totalIncome]);
  const activeExpense = useMemo(() => {
    if (balanceTab === 'total') return balanceStats.totalExpense;
    let exp = 0;
    transactions.forEach(tx => {
      if (tx.type === 'expense' && ((tx as any).payment_method || 'cash') === balanceTab) exp += tx.amount;
    });
    return exp;
  }, [transactions, balanceTab, balanceStats.totalExpense]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    transactions.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [transactions]);

  const fmt = (n: number) => currency + Math.abs(n).toLocaleString(locale);

  const showRunningBalance = (profile as any)?.show_running_balance !== false;

  const runningBalances = useMemo(() => {
    if (!showRunningBalance) return new Map<string, number>();
    const sorted = [...transactions].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.created_at.localeCompare(b.created_at);
    });
    const balances = new Map<string, number>();
    const runningByMethod: Record<string, number> = { cash: 0, upi: 0 };
    sorted.forEach(tx => {
      const method = tx.payment_method || 'cash';
      runningByMethod[method] += tx.type === 'income' ? tx.amount : -tx.amount;
      balances.set(tx.id, runningByMethod[method]);
    });
    return balances;
  }, [transactions, showRunningBalance]);

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

      {/* Search Bar */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, category, amount..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFilterSheetOpen(true)}
            className={`p-2.5 rounded-xl active:scale-95 transition-all ${hasActiveFilters ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {filterType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {filterType === 'income' ? 'Income' : 'Expense'}
                <button onClick={() => setFilterType('all')}><X size={12} /></button>
              </span>
            )}
            {filterCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {filterCategory}
                <button onClick={() => setFilterCategory(null)}><X size={12} /></button>
              </span>
            )}
            {filterPayment !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {filterPayment === 'upi' ? '💳 UPI' : '💵 Cash'}
                <button onClick={() => setFilterPayment('all')}><X size={12} /></button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground font-medium ml-1">
              Clear all
            </button>
          </div>
        )}

        {(debouncedSearch || hasActiveFilters) && (
          <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filter Bottom Sheet */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-lg font-display font-bold">Filters</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-4">
            {/* Type filter */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Type</p>
              <div className="flex gap-2">
                {(['all', 'income', 'expense'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                  >
                    {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expense'}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment method filter */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Payment Method</p>
              <div className="flex gap-2">
                {(['all', 'upi', 'cash'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setFilterPayment(m)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filterPayment === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                  >
                    {m === 'all' ? 'All' : m === 'upi' ? '💳 UPI' : '💵 Cash'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Category</p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${!filterCategory ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                >
                  All
                </button>
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={clearAllFilters} className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold text-muted-foreground active:scale-95 transition-all">
                Clear All
              </button>
              <button onClick={() => setFilterSheetOpen(false)} className="flex-1 py-2.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground active:scale-95 transition-all">
                Apply
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Balance Card with Tabs */}
      <div className="rounded-2xl bg-card p-4 border border-border mb-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Balance</p>
          <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
            {(['total', 'cash', 'upi'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setBalanceTab(tab)}
                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                  balanceTab === tab
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'total' ? 'Total' : tab === 'cash' ? '💵 Cash' : '💳 UPI'}
              </button>
            ))}
          </div>
        </div>
        <p className={`text-2xl font-display font-bold ${activeBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
          <SmartAmount amount={Math.abs(activeBalance)} currency={currency} sign={activeBalance < 0 ? '-' : ''} />
        </p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-xl bg-secondary/60 px-3 py-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Income</p>
            <p className="text-sm font-display font-bold text-green-400">
              <SmartAmount amount={activeIncome} currency={currency} sign="+" />
            </p>
          </div>
          <div className="rounded-xl bg-secondary/60 px-3 py-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Spent</p>
            <p className="text-sm font-display font-bold text-destructive">
              <SmartAmount amount={activeExpense} currency={currency} sign="-" />
            </p>
          </div>
        </div>
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
                  <span className="text-muted-foreground font-display font-semibold">
                    <SmartAmount amount={d.value} currency={currency} />
                  </span>
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
              <SmartAmount amount={Math.abs(selectionTotal)} currency={currency} sign={selectionTotal >= 0 ? '+' : '-'} />
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
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${allDateSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                    {allDateSelected && <div className="w-2 h-2 rounded-sm bg-primary-foreground" />}
                  </div>
                </button>
              )}
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {new Date(date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            {selectionMode && (
              <div className="flex items-center gap-2 text-[10px] font-display font-bold">
                {dateExpense > 0 && <span className="text-destructive">-{currency}{dateExpense.toLocaleString(locale)}</span>}
                {dateIncome > 0 && <span className="text-green-400">+{currency}{dateIncome.toLocaleString(locale)}</span>}
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
                <div
                    key={tx.id}
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
                    <div className="text-right">
                      <p className={`text-sm font-display font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-destructive'}`}>
                        {tx.payment_method === 'upi' ? '💳' : '💵'} <SmartAmount amount={tx.amount} currency={currency} sign={tx.type === 'income' ? '+' : '-'} />
                      </p>
                      {showRunningBalance && runningBalances.has(tx.id) && (
                        <p className={`text-[10px] font-display font-semibold ${runningBalances.get(tx.id)! >= 0 ? 'text-muted-foreground' : 'text-destructive/70'}`}>
                          {tx.payment_method === 'upi' ? 'UPI' : 'Cash'} Bal: <SmartAmount amount={Math.abs(runningBalances.get(tx.id)!)} currency={currency} sign={runningBalances.get(tx.id)! < 0 ? '-' : ''} />
                        </p>
                      )}
                    </div>
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
              );
            })}
          </div>
        </div>
        );
      })}

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

export default React.memo(HistoryView);
