import { useState, useMemo } from 'react';
import { X, CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { useUpdateTransaction, useCategoriesByType, useProfile, useTransactions } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  category_emoji: string;
  category_color: string;
  merchant: string;
  date: string;
  note: string | null;
  quantity: number;
  payment_method?: string;
}

interface EditTransactionModalProps {
  transaction: Transaction;
  onClose: () => void;
}

const EditTransactionModal = ({ transaction, onClose }: EditTransactionModalProps) => {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [type, setType] = useState<'expense' | 'income'>(transaction.type as 'expense' | 'income');
  const [merchant, setMerchant] = useState(transaction.merchant);
  const [date, setDate] = useState<Date>(new Date(transaction.date + 'T00:00:00'));
  const [quantity, setQuantity] = useState(String(transaction.quantity || 1));
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash'>((transaction.payment_method as 'upi' | 'cash') || 'cash');
  const [showConfirm, setShowConfirm] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const currency = profile?.currency || '₹';
  const updateTransaction = useUpdateTransaction();
  const categories = useCategoriesByType(type);
  const { data: transactions = [] } = useTransactions();

  // Sort categories by most recent usage
  const recentSortedCategories = useMemo(() => {
    const lastUsed = new Map<string, string>();
    transactions.forEach(tx => {
      const existing = lastUsed.get(tx.category);
      if (!existing || tx.date > existing) {
        lastUsed.set(tx.category, tx.date);
      }
    });
    return [...categories].sort((a, b) => {
      const aDate = lastUsed.get(a.name) || '';
      const bDate = lastUsed.get(b.name) || '';
      if (aDate && bDate) return bDate.localeCompare(aDate);
      if (aDate) return -1;
      if (bDate) return 1;
      return 0;
    });
  }, [categories, transactions]);

  const visibleCategories = useMemo(() => showAllCategories ? recentSortedCategories : recentSortedCategories.slice(0, 5), [recentSortedCategories, showAllCategories]);

  const [selectedCatName, setSelectedCatName] = useState(transaction.category);

  const handleSave = () => setShowConfirm(true);

  const handleConfirm = async () => {
    const amt = Number(amount);
    const qty = Math.max(1, parseInt(quantity) || 1);
    if (!amt || amt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    const cat = recentSortedCategories.find(c => c.name === selectedCatName);
    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        amount: amt,
        type,
        category: cat.name,
        category_emoji: cat.emoji,
        category_color: cat.color,
        merchant: merchant || cat.name,
        date: format(date, 'yyyy-MM-dd'),
        quantity: qty,
        payment_method: paymentMethod,
      });
      toast({ title: 'Transaction updated!' });
      onClose();
    } catch {
      toast({ title: 'Error updating transaction', variant: 'destructive' });
    }
    setShowConfirm(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-lg bg-card rounded-t-3xl border border-border/50 p-6 pb-10 animate-in" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-bold text-foreground">Edit Transaction</h2>
            <button onClick={onClose} className="p-2 rounded-full bg-secondary active:scale-95 transition-all">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Type Toggle */}
          <div className="flex rounded-xl bg-secondary p-1 mb-6">
            <button onClick={() => setType('expense')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'expense' ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground'}`}>
              Expense
            </button>
            <button onClick={() => setType('income')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'income' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
              Income
            </button>
          </div>

          {/* Amount */}
          <div className="text-center mb-6">
            <span className="text-muted-foreground text-2xl font-display font-bold">{currency}</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="text-5xl font-display font-bold text-foreground bg-transparent text-center w-48 outline-none placeholder:text-muted-foreground/30" />
          </div>

          {/* Quantity + Merchant */}
          <div className="flex gap-3 mb-4">
            <div className="w-24">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Qty</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" className="w-full px-4 py-3.5 rounded-xl bg-secondary text-foreground border border-border focus:border-primary focus:outline-none transition-all text-sm text-center font-display font-bold" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Merchant / Note</label>
              <input type="text" value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="Merchant / Note" className="w-full px-5 py-3.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-all text-sm" />
            </div>
          </div>

          {/* Date Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className={cn("w-full px-5 py-3.5 rounded-xl bg-secondary text-sm border border-border focus:border-primary transition-all text-left flex items-center gap-3 mb-4")}>
                <CalendarIcon size={16} className="text-muted-foreground" />
                {format(date, 'EEE, dd MMM yyyy')}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar mode="single" selected={date} onSelect={d => { if (d) { setDate(d); setCalendarOpen(false); } }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {/* Payment Method Toggle */}
          <div className="mb-4">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Payment Method</label>
            <div className="flex rounded-xl bg-secondary p-1">
              <button
                onClick={() => setPaymentMethod('upi')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${paymentMethod === 'upi' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                💳 UPI
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${paymentMethod === 'cash' ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                💵 Cash
              </button>
            </div>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-5 gap-2 mb-2">
            {visibleCategories.map((cat) => (
              <button key={cat.name} onClick={() => setSelectedCatName(cat.name)} className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all active:scale-95 ${selectedCatName === cat.name ? 'bg-primary/20 ring-1 ring-primary' : 'bg-secondary'}`}>
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[9px] font-semibold text-muted-foreground truncate w-full text-center px-0.5">{cat.name}</span>
              </button>
            ))}
          </div>
          {categories.length > 5 || !showAllCategories ? (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="w-full text-center text-xs font-semibold text-primary py-2 mb-4 active:scale-95 transition-all"
            >
              {showAllCategories ? 'Show less' : `See more (${categories.length - 5 + 1}+)`}
            </button>
          ) : (
            <div className="mb-4" />
          )}

          <button onClick={handleSave} disabled={updateTransaction.isPending} className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-base active:scale-95 transition-all disabled:opacity-50" style={{ boxShadow: 'var(--shadow-glow)' }}>
            <span className="flex items-center justify-center gap-2"><Save size={18} /> Save Changes</span>
          </button>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl border-border/50 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to make these changes? This action will update the transaction.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditTransactionModal;
