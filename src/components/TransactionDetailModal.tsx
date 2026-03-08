import { X, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useProfile } from '@/lib/store';

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
  created_at?: string;
}

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
  onEdit: () => void;
}

const TransactionDetailModal = ({ transaction, onClose, onEdit }: TransactionDetailModalProps) => {
  const { data: profile } = useProfile();
  const currency = profile?.currency || '₹';
  const locale = currency === '₹' ? 'en-IN' : 'en-US';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card rounded-t-3xl border border-border/50 p-6 pb-10 animate-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">Transaction Details</h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-2 rounded-full bg-secondary active:scale-95 transition-all">
              <Pencil size={18} className="text-muted-foreground" />
            </button>
            <button onClick={onClose} className="p-2 rounded-full bg-secondary active:scale-95 transition-all">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3" style={{ backgroundColor: transaction.category_color + '20' }}>
            {transaction.category_emoji}
          </div>
          <p className={`text-4xl font-display font-bold ${transaction.type === 'income' ? 'text-green-400' : 'text-destructive'}`}>
            {transaction.type === 'income' ? '+' : '-'}{currency}{transaction.amount.toLocaleString(locale)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{transaction.merchant}</p>
        </div>

        {/* Details Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</span>
            <span className={`text-sm font-bold ${transaction.type === 'income' ? 'text-green-400' : 'text-destructive'}`}>
              {transaction.type === 'income' ? 'Income' : 'Expense'}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</span>
            <span className="text-sm font-medium text-foreground">{transaction.category_emoji} {transaction.category}</span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</span>
            <span className="text-sm font-medium text-foreground">
              {format(new Date(transaction.date + 'T00:00:00'), 'EEE, dd MMM yyyy')}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</span>
            <span className="text-sm font-medium text-foreground">
              {transaction.payment_method === 'upi' ? '💳 UPI' : '💵 Cash'}
            </span>
          </div>

          {transaction.quantity > 1 && (
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantity</span>
              <span className="text-sm font-medium text-foreground">{transaction.quantity}</span>
            </div>
          )}

          {transaction.note && (
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Note</span>
              <span className="text-sm font-medium text-foreground">{transaction.note}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;
