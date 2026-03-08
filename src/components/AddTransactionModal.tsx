import { useState } from 'react';
import { X, CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useAddTransaction, useAllCategories } from '@/lib/store';
import { useProfile } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import AddCategoryModal from '@/components/AddCategoryModal';

interface AddTransactionModalProps {
  onClose: () => void;
}

const AddTransactionModal = ({ onClose }: AddTransactionModalProps) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [selectedCat, setSelectedCat] = useState(0);
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash'>('upi');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const currency = profile?.currency || '₹';
  const addTransaction = useAddTransaction();
  const categories = useAllCategories();

  const handleSubmit = async () => {
    const amt = Number(amount);
    const qty = Math.max(1, parseInt(quantity) || 1);
    if (!amt || amt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    const cat = categories[selectedCat];
    if (!cat) {
      toast({ title: 'Select a category', variant: 'destructive' });
      return;
    }
    try {
      await addTransaction.mutateAsync({
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
      toast({ title: `${type === 'income' ? 'Income' : 'Expense'} added!` });
      onClose();
    } catch {
      toast({ title: 'Error adding transaction', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
        <div
          className="w-full max-w-lg bg-card rounded-t-3xl border border-border/50 p-6 pb-10 animate-in"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-bold text-foreground">Add Transaction</h2>
            <button onClick={onClose} className="p-2 rounded-full bg-secondary active:scale-95 transition-all">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Type Toggle */}
          <div className="flex rounded-xl bg-secondary p-1 mb-6">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'expense' ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground'}`}
            >
              Expense
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${type === 'income' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div className="text-center mb-6">
            <span className="text-muted-foreground text-2xl font-display font-bold">{currency}</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="text-5xl font-display font-bold text-foreground bg-transparent text-center w-48 outline-none placeholder:text-muted-foreground/30"
              autoFocus
            />
          </div>

          {/* Quantity + Merchant */}
          <div className="flex gap-3 mb-4">
            <div className="w-24">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Qty</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="1"
                className="w-full px-4 py-3.5 rounded-xl bg-secondary text-foreground border border-border focus:border-primary focus:outline-none transition-all text-sm text-center font-display font-bold"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Merchant / Note</label>
              <input
                type="text"
                value={merchant}
                onChange={e => setMerchant(e.target.value)}
                placeholder="Merchant / Note"
                className="w-full px-5 py-3.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-all text-sm"
              />
            </div>
          </div>

          {/* Date Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "w-full px-5 py-3.5 rounded-xl bg-secondary text-sm border border-border focus:border-primary transition-all text-left flex items-center gap-3 mb-4",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon size={16} className="text-muted-foreground" />
                {date ? format(date, 'EEE, dd MMM yyyy') : 'Select date'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { if (d) { setDate(d); setCalendarOpen(false); } }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
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
                📱 UPI
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
          <div className="grid grid-cols-5 gap-2 mb-6">
            {categories.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCat(i)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all active:scale-95 ${
                  selectedCat === i ? 'bg-primary/20 ring-1 ring-primary' : 'bg-secondary'
                }`}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[9px] font-semibold text-muted-foreground truncate w-full text-center px-0.5">{cat.name}</span>
              </button>
            ))}
            <button
              onClick={() => setShowAddCategory(true)}
              className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all active:scale-95 bg-secondary border border-dashed border-border hover:border-primary/50"
            >
              <Plus size={20} className="text-muted-foreground" />
              <span className="text-[9px] font-semibold text-muted-foreground">New</span>
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={addTransaction.isPending}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-base active:scale-95 transition-all disabled:opacity-50"
            style={{ boxShadow: 'var(--shadow-glow)' }}
          >
            {addTransaction.isPending ? 'Adding...' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
          </button>
        </div>
      </div>

      {showAddCategory && (
        <AddCategoryModal
          onClose={() => setShowAddCategory(false)}
        />
      )}
    </>
  );
};

export default AddTransactionModal;
