import { useState } from 'react';
import { X, CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { addTransaction, getAllCategories, getCurrency } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import AddCategoryModal from '@/components/AddCategoryModal';

interface AddTransactionModalProps {
  onClose: () => void;
  onAdded: () => void;
}

const AddTransactionModal = ({ onClose, onAdded }: AddTransactionModalProps) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [selectedCat, setSelectedCat] = useState(0);
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catRefresh, setCatRefresh] = useState(0);
  const { toast } = useToast();
  const currency = getCurrency();

  const categories = getAllCategories();

  const handleSubmit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    const cat = categories[selectedCat];
    if (!cat) {
      toast({ title: 'Select a category', variant: 'destructive' });
      return;
    }
    addTransaction({
      amount: amt,
      type,
      category: cat.name,
      categoryEmoji: cat.emoji,
      categoryColor: cat.color,
      merchant: merchant || cat.name,
      date: format(date, 'yyyy-MM-dd'),
    });
    toast({ title: `${type === 'income' ? 'Income' : 'Expense'} added!` });
    onAdded();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
        <div
          className="w-full max-w-lg bg-card rounded-t-[40px] border border-border/50 p-6 pb-10 animate-in"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-foreground">Add Transaction</h2>
            <button onClick={onClose} className="p-2 rounded-full bg-secondary active:scale-95 transition-all">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>

          {/* Type Toggle */}
          <div className="flex rounded-3xl bg-secondary p-1 mb-6">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-3 rounded-3xl text-sm font-bold transition-all ${type === 'expense' ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground'}`}
            >
              Expense
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 py-3 rounded-3xl text-sm font-bold transition-all ${type === 'income' ? 'bg-success text-success-foreground' : 'text-muted-foreground'}`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div className="text-center mb-6">
            <span className="text-muted-foreground text-2xl font-bold">{currency}</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="text-5xl font-black text-foreground bg-transparent text-center w-48 outline-none placeholder:text-muted-foreground/30"
              autoFocus
            />
          </div>

          {/* Merchant */}
          <input
            type="text"
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
            placeholder="Merchant / Note"
            className="w-full px-5 py-3.5 rounded-3xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-all text-sm mb-6"
          />

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "w-full px-5 py-3.5 rounded-3xl bg-secondary text-sm border border-border focus:border-primary transition-all text-left flex items-center gap-3 mb-6",
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
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {/* Category Grid */}
          <div className="grid grid-cols-5 gap-2 mb-6" key={catRefresh}>
            {categories.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCat(i)}
                className={`flex flex-col items-center gap-1 py-3 rounded-3xl transition-all active:scale-95 ${
                  selectedCat === i ? 'bg-primary/20 border border-primary/50' : 'bg-secondary'
                }`}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[9px] font-semibold text-muted-foreground truncate w-full text-center px-0.5">{cat.name}</span>
              </button>
            ))}
            {/* Add Category Button */}
            <button
              onClick={() => setShowAddCategory(true)}
              className="flex flex-col items-center gap-1 py-3 rounded-3xl transition-all active:scale-95 bg-secondary border border-dashed border-border hover:border-primary/50"
            >
              <Plus size={20} className="text-muted-foreground" />
              <span className="text-[9px] font-semibold text-muted-foreground">New</span>
            </button>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-4 rounded-3xl gradient-primary text-primary-foreground font-bold text-base active:scale-95 transition-all glow-primary"
          >
            Add {type === 'income' ? 'Income' : 'Expense'}
          </button>
        </div>
      </div>

      {showAddCategory && (
        <AddCategoryModal
          onClose={() => setShowAddCategory(false)}
          onAdded={() => setCatRefresh(r => r + 1)}
        />
      )}
    </>
  );
};

export default AddTransactionModal;
