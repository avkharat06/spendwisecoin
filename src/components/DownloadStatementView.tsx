import { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowLeft, Search, SlidersHorizontal, X, Download, Loader2, Calendar } from 'lucide-react';
import { useTransactions, useProfile, useAllCategories, useIncrementStatementDownloads } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  onBack: () => void;
}

type FilterState = {
  dateFrom?: Date;
  dateTo?: Date;
  category?: string;
  paymentMethod?: 'upi' | 'cash';
  type?: 'expense' | 'income';
};

const DownloadStatementView = ({ onBack }: Props) => {
  const { data: transactions = [] } = useTransactions();
  const { data: profile } = useProfile();
  const allCategories = useAllCategories();
  const incrementDownloads = useIncrementStatementDownloads();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      // Search
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (!tx.merchant.toLowerCase().includes(q) && !tx.category.toLowerCase().includes(q)) return false;
      }
      // Date range
      if (filters.dateFrom || filters.dateTo) {
        const txDate = parseISO(tx.date);
        if (filters.dateFrom && txDate < filters.dateFrom) return false;
        if (filters.dateTo) {
          const end = new Date(filters.dateTo);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) return false;
        }
      }
      if (filters.category && tx.category !== filters.category) return false;
      if (filters.paymentMethod && tx.payment_method !== filters.paymentMethod) return false;
      if (filters.type && tx.type !== filters.type) return false;
      return true;
    });
  }, [transactions, debouncedSearch, filters]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.dateFrom) chips.push({ key: 'dateFrom', label: `From: ${format(filters.dateFrom, 'dd MMM yyyy')}` });
    if (filters.dateTo) chips.push({ key: 'dateTo', label: `To: ${format(filters.dateTo, 'dd MMM yyyy')}` });
    if (filters.category) chips.push({ key: 'category', label: filters.category });
    if (filters.paymentMethod) chips.push({ key: 'paymentMethod', label: filters.paymentMethod.toUpperCase() });
    if (filters.type) chips.push({ key: 'type', label: filters.type === 'expense' ? 'Expense' : 'Income' });
    return chips;
  }, [filters]);

  const removeFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: undefined }));
  };

  const clearAllFilters = () => setFilters({});

  const currency = profile?.currency || '₹';

  const fmtAmount = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const handleDownload = useCallback(async () => {
    if (filtered.length === 0) {
      toast({ title: 'No transactions to download' });
      return;
    }

    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('SpendWise', 14, 20);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Transaction Statement', 14, 30);

      doc.setFontSize(10);
      doc.text(profile?.display_name || 'User', 14, 38);

      // Date range
      const dates = filtered.map(t => t.date).sort();
      const dateRange = dates.length > 0 ? `${format(parseISO(dates[0]), 'dd MMM yyyy')} - ${format(parseISO(dates[dates.length - 1]), 'dd MMM yyyy')}` : 'N/A';
      doc.text(`Period: ${dateRange}`, 14, 44);
      doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, 50);

      doc.setDrawColor(200);
      doc.line(14, 54, pageWidth - 14, 54);

      // Summary
      const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const cashBalance = filtered.reduce((s, t) => t.payment_method === 'cash' ? s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)) : s, 0);
      const upiBalance = filtered.reduce((s, t) => t.payment_method === 'upi' ? s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)) : s, 0);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, 62);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      let sy = 70;
      doc.setTextColor(34, 139, 34);
      doc.text(`Total Income: ${currency}${fmtAmount(totalIncome)}`, 14, sy);
      doc.setTextColor(220, 53, 69);
      doc.text(`Total Expenses: ${currency}${fmtAmount(totalExpense)}`, 14, sy + 6);
      doc.setTextColor(59, 130, 246);
      doc.text(`Net Balance: ${currency}${fmtAmount(totalIncome - totalExpense)}`, 14, sy + 12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Cash Balance: ${currency}${fmtAmount(cashBalance)}`, 14, sy + 18);
      doc.text(`UPI Balance: ${currency}${fmtAmount(upiBalance)}`, 14, sy + 24);

      doc.line(14, sy + 28, pageWidth - 14, sy + 28);

      // Table
      const tableData = filtered.map(tx => [
        format(parseISO(tx.date), 'dd/MM/yyyy'),
        tx.merchant || '-',
        `${tx.category_emoji} ${tx.category}`,
        tx.payment_method.toUpperCase(),
        tx.type === 'income' ? 'Income' : 'Expense',
        `${tx.type === 'expense' ? '-' : '+'}${currency}${fmtAmount(Number(tx.amount))}`,
      ]);

      autoTable(doc, {
        startY: sy + 32,
        head: [['Date', 'Description', 'Category', 'Payment', 'Type', 'Amount']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          5: { halign: 'right' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 5) {
            const row = filtered[data.row.index];
            if (row) {
              data.cell.styles.textColor = row.type === 'income' ? [34, 139, 34] : [220, 53, 69];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        didDrawPage: (data: any) => {
          // Footer
          const pageCount = (doc as any).internal.getNumberOfPages();
          const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setDrawColor(200);
          doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
          doc.setFontSize(8);
          doc.setTextColor(128);
          doc.text('Generated by SpendWise', pageWidth / 2, pageHeight - 12, { align: 'center' });
          doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
        },
      });

      const userName = (profile?.display_name || 'User').replace(/\s+/g, '_');
      const dateStr = format(new Date(), 'yyyyMMdd');
      doc.save(`SpendWise_Statement_${userName}_${dateStr}.pdf`);

      toast({ title: 'Statement downloaded successfully ✓' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Download failed, please try again', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }, [filtered, profile, currency, incrementDownloads, toast]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-lg font-display font-bold text-foreground">Download Statement</h2>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className={`p-2.5 rounded-xl transition-all active:scale-95 ${activeFilterChips.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Filter chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilterChips.map(chip => (
            <span key={chip.key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
              {chip.label}
              <button onClick={() => removeFilter(chip.key)}>
                <X size={12} />
              </button>
            </span>
          ))}
          <button onClick={clearAllFilters} className="text-xs text-destructive font-medium px-2 py-1">
            Clear all
          </button>
        </div>
      )}

      {/* Transaction count */}
      <p className="text-xs text-muted-foreground">Showing {filtered.length} transactions</p>

      {/* Transaction list preview */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No transactions found</div>
        ) : (
          filtered.map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-secondary/50">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{tx.category_emoji}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.merchant || tx.category}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(tx.date), 'dd MMM yyyy')} · {tx.payment_method.toUpperCase()}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                {tx.type === 'income' ? '+' : '-'}{currency}{Number(tx.amount).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={generating}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
      >
        {generating ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Generating your statement...
          </>
        ) : (
          <>
            <Download size={18} />
            Download Statement
          </>
        )}
      </button>

      {/* Filter sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display">Filters</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-4">
            {/* Date From */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary text-sm text-foreground">
                    <Calendar size={14} className="text-muted-foreground" />
                    {filters.dateFrom ? format(filters.dateFrom, 'dd MMM yyyy') : 'Select start date'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarUI mode="single" selected={filters.dateFrom} onSelect={d => setFilters(p => ({ ...p, dateFrom: d || undefined }))} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary text-sm text-foreground">
                    <Calendar size={14} className="text-muted-foreground" />
                    {filters.dateTo ? format(filters.dateTo, 'dd MMM yyyy') : 'Select end date'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarUI mode="single" selected={filters.dateTo} onSelect={d => setFilters(p => ({ ...p, dateTo: d || undefined }))} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setFilters(p => ({ ...p, category: p.category === cat.name ? undefined : cat.name }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.category === cat.name ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
                  >
                    {cat.emoji} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Method</label>
              <div className="flex gap-2">
                {(['cash', 'upi'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setFilters(p => ({ ...p, paymentMethod: p.paymentMethod === m ? undefined : m }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${filters.paymentMethod === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilters(p => ({ ...p, type: p.type === t ? undefined : t }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${filters.type === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
                  >
                    {t === 'expense' ? 'Expense' : 'Income'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowFilters(false)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm active:scale-95 transition-all"
            >
              Apply Filters
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DownloadStatementView;
