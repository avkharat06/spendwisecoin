import React, { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, CheckSquare, Square, Download, BarChart3, Grid, List, X, Calendar, Search } from 'lucide-react';
import { useTransactions, useProfile } from '@/lib/store';
import { SmartAmount } from '@/lib/format-amount';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, getDay } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AnalysisModeProps {
  onBack: () => void;
}

const PIE_COLORS = ['#5B4FE8', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#8B5CF6', '#F97316', '#14B8A6', '#E11D48', '#6366F1'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AnalysisMode: React.FC<AnalysisModeProps> = ({ onBack }) => {
  const { data: allTransactions = [], isLoading } = useTransactions();
  const { data: profile } = useProfile();
  const currency = profile?.currency || '₹';
  const { toast } = useToast();

  // Filters
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'upi' | 'cash'>('all');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sort & Group & View
  const [sortBy, setSortBy] = useState<'date' | 'amount-high' | 'amount-low' | 'category'>('date');
  const [groupBy, setGroupBy] = useState<'date' | 'category' | 'payment'>('date');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // All categories from transactions
  const allCategories = useMemo(() => {
    const cats = new Set(allTransactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [allTransactions]);

  // Filtered transactions
  const filtered = useMemo(() => {
    let txs = allTransactions.filter(t => !t.is_deleted);

    if (dateFrom) txs = txs.filter(t => parseISO(t.date) >= dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      txs = txs.filter(t => parseISO(t.date) <= end);
    }
    if (selectedCategories.length > 0) txs = txs.filter(t => selectedCategories.includes(t.category));
    if (paymentFilter !== 'all') txs = txs.filter(t => t.payment_method === paymentFilter);
    if (amountMin) txs = txs.filter(t => Number(t.amount) >= Number(amountMin));
    if (amountMax) txs = txs.filter(t => Number(t.amount) <= Number(amountMax));
    if (typeFilter !== 'all') txs = txs.filter(t => t.type === typeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter(t => t.merchant.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || String(t.amount).includes(q));
    }

    // Sort
    switch (sortBy) {
      case 'date': txs.sort((a, b) => b.date.localeCompare(a.date)); break;
      case 'amount-high': txs.sort((a, b) => Number(b.amount) - Number(a.amount)); break;
      case 'amount-low': txs.sort((a, b) => Number(a.amount) - Number(b.amount)); break;
      case 'category': txs.sort((a, b) => a.category.localeCompare(b.category)); break;
    }

    return txs;
  }, [allTransactions, dateFrom, dateTo, selectedCategories, paymentFilter, amountMin, amountMax, typeFilter, searchQuery, sortBy]);

  // Summary
  const summary = useMemo(() => {
    const source = selected.size > 0 ? filtered.filter(t => selected.has(t.id)) : filtered;
    const income = source.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = source.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { count: source.length, income, expense, net: income - expense };
  }, [filtered, selected]);

  // Grouped transactions
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(t => {
      let key: string;
      switch (groupBy) {
        case 'date': key = t.date; break;
        case 'category': key = `${t.category_emoji} ${t.category}`; break;
        case 'payment': key = t.payment_method.toUpperCase(); break;
        default: key = t.date;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups);
  }, [filtered, groupBy]);

  // Analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = filtered.filter(t => {
      const d = parseISO(t.date);
      return d >= startOfMonth(now) && d <= endOfMonth(now) && t.type === 'expense';
    });
    const lastMonth = allTransactions.filter(t => {
      const d = parseISO(t.date);
      const lm = subMonths(now, 1);
      return d >= startOfMonth(lm) && d <= endOfMonth(lm) && t.type === 'expense' && !t.is_deleted;
    });

    const thisTotal = thisMonth.reduce((s, t) => s + Number(t.amount), 0);
    const lastTotal = lastMonth.reduce((s, t) => s + Number(t.amount), 0);
    const velocityPct = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : 0;

    // Biggest expense
    const expenses = filtered.filter(t => t.type === 'expense');
    const biggest = expenses.length > 0 ? expenses.reduce((a, b) => Number(a.amount) > Number(b.amount) ? a : b) : null;

    // Category pie
    const catMap: Record<string, number> = {};
    expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount); });
    const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Day of week
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    expenses.forEach(t => { dayTotals[getDay(parseISO(t.date))] += Number(t.amount); });
    const dayData = DAYS.map((name, i) => ({ name, amount: dayTotals[i] }));
    const maxDayIdx = dayTotals.indexOf(Math.max(...dayTotals));

    // Merchant frequency
    const merchantMap: Record<string, { count: number; total: number }> = {};
    filtered.forEach(t => {
      const m = t.merchant || 'Unknown';
      if (!merchantMap[m]) merchantMap[m] = { count: 0, total: 0 };
      merchantMap[m].count++;
      merchantMap[m].total += Number(t.amount);
    });
    const topMerchants = Object.entries(merchantMap)
      .map(([name, { count, total }]) => ({ name, count, total }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { velocityPct, thisTotal, lastTotal, biggest, pieData, dayData, maxDayIdx, topMerchants };
  }, [filtered, allTransactions]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelected(new Set(filtered.map(t => t.id)));
  const clearSelection = () => setSelected(new Set());

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleExport = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      const source = selected.size > 0 ? filtered.filter(t => selected.has(t.id)) : filtered;
      if (source.length === 0) {
        toast({ title: 'No transactions to export' });
        return;
      }

      const data = source.map(t => ({
        Date: format(parseISO(t.date), 'dd/MM/yyyy'),
        Description: t.merchant || '-',
        Category: `${t.category_emoji} ${t.category}`,
        Payment: t.payment_method.toUpperCase(),
        Type: t.type === 'income' ? 'Income' : 'Expense',
        Amount: `${t.type === 'expense' ? '-' : '+'}${currency}${Number(t.amount).toLocaleString(currency === '₹' ? 'en-IN' : 'en-US')}`,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `SpendWise_Analysis_${format(new Date(), 'yyyyMMdd')}.xlsx`);
      toast({ title: 'Excel exported successfully ✓' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  }, [filtered, selected, currency, toast]);

  const fmtAmt = (n: number) => `${currency}${n.toLocaleString(currency === '₹' ? 'en-IN' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <div className="animate-in pb-4 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 rounded-xl bg-secondary"><ArrowLeft size={18} /></button>
          <h2 className="text-2xl font-display font-bold text-foreground">Analysis Mode</h2>
        </div>
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  if (allTransactions.filter(t => !t.is_deleted).length === 0) {
    return (
      <div className="animate-in pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 rounded-xl bg-secondary"><ArrowLeft size={18} /></button>
          <h2 className="text-2xl font-display font-bold text-foreground">Analysis Mode</h2>
        </div>
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <BarChart3 size={48} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No transactions to analyze</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in pb-20 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground flex-1">Analysis Mode</h2>
      </div>

      {/* Summary Card */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            {selected.size > 0 ? `${selected.size} selected` : `${summary.count} transactions`}
          </span>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <button onClick={clearSelection} className="text-xs px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground active:scale-95">Clear</button>
            )}
            <button onClick={selectAll} className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary active:scale-95 font-medium">Select All</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">{selected.size > 0 ? 'Sel. Income' : 'Income'}</p>
            <SmartAmount amount={summary.income} currency={currency} className="text-sm font-bold text-emerald-500" />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">{selected.size > 0 ? 'Sel. Expenses' : 'Expenses'}</p>
            <SmartAmount amount={summary.expense} currency={currency} className="text-sm font-bold text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">{selected.size > 0 ? 'Sel. Net' : 'Net Balance'}</p>
            <SmartAmount amount={summary.net} currency={currency} className="text-sm font-bold text-blue-500" />
          </div>
        </div>
      </div>

      {/* Smart Filters */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Filters</p>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-muted-foreground" /></button>}
        </div>

        {/* Date range */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground">
                <Calendar size={14} className="text-muted-foreground" />
                {dateFrom ? format(dateFrom, 'dd MMM') : 'From'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarUI mode="single" selected={dateFrom} onSelect={setDateFrom} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground">
                <Calendar size={14} className="text-muted-foreground" />
                {dateTo ? format(dateTo, 'dd MMM') : 'To'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarUI mode="single" selected={dateTo} onSelect={setDateTo} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} className="p-2 rounded-xl bg-secondary"><X size={14} className="text-muted-foreground" /></button>
          )}
        </div>

        {/* Type */}
        <div className="flex gap-2">
          {(['all', 'income', 'expense'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              {t === 'all' ? 'Both' : t === 'income' ? 'Income' : 'Expense'}
            </button>
          ))}
        </div>

        {/* Payment */}
        <div className="flex gap-2">
          {(['all', 'upi', 'cash'] as const).map(p => (
            <button key={p} onClick={() => setPaymentFilter(p)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${paymentFilter === p ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              {p === 'all' ? 'All' : p === 'upi' ? '💳 UPI' : '💵 Cash'}
            </button>
          ))}
        </div>

        {/* Amount range */}
        <div className="flex gap-2">
          <input type="number" placeholder="Min amt" value={amountMin} onChange={e => setAmountMin(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none" />
          <input type="number" placeholder="Max amt" value={amountMax} onChange={e => setAmountMax(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none" />
        </div>

        {/* Category multiselect */}
        <div className="flex flex-wrap gap-1.5">
          {allCategories.map(cat => (
            <button key={cat} onClick={() => toggleCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${selectedCategories.includes(cat) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sort & Group & View */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex gap-2 items-center">
          <span className="text-xs font-semibold text-foreground shrink-0">Sort:</span>
          <div className="flex gap-1 flex-wrap flex-1">
            {([['date', 'Date'], ['amount-high', '↑ Amt'], ['amount-low', '↓ Amt'], ['category', 'Category']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setSortBy(val as any)}
                className={`px-2 py-1 rounded-lg text-xs font-medium ${sortBy === val ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs font-semibold text-foreground shrink-0">Group:</span>
          <div className="flex gap-1 flex-1">
            {([['date', 'Date'], ['category', 'Category'], ['payment', 'Payment']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setGroupBy(val as any)}
                className={`px-2 py-1 rounded-lg text-xs font-medium ${groupBy === val ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-auto">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}><List size={14} /></button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}><Grid size={14} /></button>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {grouped.map(([group, txs]) => (
        <div key={group} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-1">
            {groupBy === 'date' ? format(parseISO(group), 'dd MMM yyyy') : group}
          </p>
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {txs.map(tx => {
              const isSelected = selected.has(tx.id);
              return (
                <button key={tx.id} onClick={() => toggleSelect(tx.id)}
                  className={`w-full text-left rounded-2xl border p-3 transition-all active:scale-[0.98] ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      {isSelected ? <CheckSquare size={14} /> : <Square size={14} className="text-muted-foreground" />}
                    </span>
                    <span className="text-lg">{tx.category_emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{tx.merchant || tx.category}</p>
                      <p className="text-xs text-muted-foreground">{tx.category} · {tx.payment_method.toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {tx.type === 'income' ? '+' : '-'}{fmtAmt(Number(tx.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(tx.date), 'dd MMM')}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="rounded-2xl bg-card border border-border p-8 text-center">
          <p className="text-muted-foreground text-sm">No transactions match your filters</p>
        </div>
      )}

      {/* Analytics Section */}
      {filtered.length > 0 && (
        <div className="space-y-4 pt-2">
          <p className="text-lg font-bold text-foreground">Analytics</p>

          {/* Spending Velocity */}
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Spending Velocity</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl ${analytics.velocityPct > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {analytics.velocityPct > 0 ? '↑' : '↓'}
              </span>
              <p className="text-sm text-foreground">
                You're spending <span className="font-bold">{Math.abs(analytics.velocityPct).toFixed(1)}%</span>{' '}
                {analytics.velocityPct > 0 ? 'faster' : 'slower'} than last month
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month: {fmtAmt(analytics.thisTotal)} · Last month: {fmtAmt(analytics.lastTotal)}</p>
          </div>

          {/* Biggest Transaction */}
          {analytics.biggest && (
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="text-sm font-semibold text-foreground mb-2">Biggest Expense</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{analytics.biggest.category_emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{analytics.biggest.merchant || analytics.biggest.category}</p>
                  <p className="text-xs text-muted-foreground">{analytics.biggest.category} · {format(parseISO(analytics.biggest.date), 'dd MMM yyyy')}</p>
                </div>
                <p className="text-lg font-bold text-red-500">{fmtAmt(Number(analytics.biggest.amount))}</p>
              </div>
            </div>
          )}

          {/* Category Pie Chart */}
          {analytics.pieData.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Spending by Category</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {analytics.pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val: number) => fmtAmt(val)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {analytics.pieData.slice(0, 6).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day of Week */}
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-sm font-semibold text-foreground mb-1">Day of Week Spending</p>
            <p className="text-xs text-muted-foreground mb-3">You spend most on <span className="font-bold text-foreground">{DAYS[analytics.maxDayIdx]}</span></p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dayData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val: number) => fmtAmt(val)} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {analytics.dayData.map((_, i) => (
                      <Cell key={i} fill={i === analytics.maxDayIdx ? '#EF4444' : 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Merchant Frequency */}
          {analytics.topMerchants.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Top Merchants</p>
              <div className="space-y-2.5">
                {analytics.topMerchants.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.count} transactions</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{fmtAmt(m.total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Button */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
        <button onClick={handleExport}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg">
          <Download size={18} />
          {selected.size > 0 ? `Export ${selected.size} Selected` : 'Export All'} to Excel
        </button>
      </div>
    </div>
  );
};

export default React.memo(AnalysisMode);
