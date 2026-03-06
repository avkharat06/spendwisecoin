import { useMemo } from 'react';
import { getActiveUser, getTransactions, Transaction, getCurrency } from '@/lib/auth';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface DashboardProps {
  onFilterView?: (filter: 'expense' | 'income' | 'all') => void;
  onCategoryView?: (category: string) => void;
}

const Dashboard = ({ onFilterView, onCategoryView }: DashboardProps) => {
  const user = getActiveUser();
  const transactions = getTransactions();
  const currency = getCurrency();

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let todaySpent = 0, todayIncome = 0;
    let monthSpent = 0, monthIncome = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const txDay = tx.date || txDate.toISOString().split('T')[0];

      if (txDay === today) {
        if (tx.type === 'expense') todaySpent += tx.amount;
        else todayIncome += tx.amount;
      }
      if (txDate >= monthStart) {
        if (tx.type === 'expense') monthSpent += tx.amount;
        else monthIncome += tx.amount;
      }
    });

    const totalBalance = monthIncome - monthSpent;
    const budgetUsage = user?.monthlyBudget ? (monthSpent / user.monthlyBudget) * 100 : 0;

    return { todaySpent, todayIncome, todayNet: todayIncome - todaySpent, monthSpent, monthIncome, totalBalance, budgetUsage };
  }, [transactions, user]);

  const recentTx = transactions.slice(0, 5);

  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.timestamp) >= monthStart);
    const total = monthExpenses.reduce((s, t) => s + t.amount, 0);
    const grouped: Record<string, { amount: number; emoji: string; color: string }> = {};
    monthExpenses.forEach(tx => {
      if (!grouped[tx.category]) grouped[tx.category] = { amount: 0, emoji: tx.categoryEmoji, color: tx.categoryColor };
      grouped[tx.category].amount += tx.amount;
    });
    return Object.entries(grouped)
      .map(([name, data]) => ({ name, ...data, percent: total > 0 ? (data.amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const fmt = (n: number) => currency + Math.abs(n).toLocaleString(currency === '₹' ? 'en-IN' : 'en-US');

  return (
    <div className="animate-in space-y-6 pb-4">
      {/* Greeting */}
      <div>
        <p className="text-muted-foreground text-sm">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</p>
        <h2 className="text-2xl font-black text-foreground">{user?.name?.split(' ')[0] || 'User'}</h2>
      </div>

      {/* Main Balance Card */}
      <div className="card-premium relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-20%] w-[50%] h-[70%] rounded-full opacity-30" style={{ background: 'var(--gradient-glow-primary)' }} />
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">Monthly Balance</p>
        <p className={`text-5xl font-black ${stats.totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
          {stats.totalBalance >= 0 ? '+' : '-'}{fmt(stats.totalBalance)}
        </p>

        {/* Today's Stats - Clickable */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <button onClick={() => onFilterView?.('expense')} className="active:scale-95 transition-all">
            <StatBox icon={<TrendingDown size={14} />} label="Spent" value={fmt(stats.todaySpent)} color="text-destructive" />
          </button>
          <button onClick={() => onFilterView?.('income')} className="active:scale-95 transition-all">
            <StatBox icon={<TrendingUp size={14} />} label="Income" value={fmt(stats.todayIncome)} color="text-success" />
          </button>
          <button onClick={() => onFilterView?.('all')} className="active:scale-95 transition-all">
            <StatBox icon={<Minus size={14} />} label="Net" value={fmt(Math.abs(stats.todayNet))} color={stats.todayNet >= 0 ? 'text-success' : 'text-destructive'} />
          </button>
        </div>

        {/* Budget Bar */}
        {user?.monthlyBudget && user.monthlyBudget > 0 && (
          <div className="mt-6">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">Budget Used</span>
              <span className={`font-bold ${stats.budgetUsage > 90 ? 'text-destructive' : 'text-primary'}`}>
                {Math.round(stats.budgetUsage)}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${stats.budgetUsage > 90 ? 'bg-destructive glow-danger' : 'gradient-primary glow-primary'}`}
                style={{ width: `${Math.min(stats.budgetUsage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {fmt(stats.monthSpent)} of {fmt(user.monthlyBudget)}
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentTx.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentTx.map(tx => (
              <TransactionRow key={tx.id} tx={tx} currency={currency} />
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Spending by Category</h3>
          <div className="card-premium space-y-4">
            {categoryBreakdown.map(cat => (
              <button
                key={cat.name}
                onClick={() => onCategoryView?.(cat.name)}
                className="w-full text-left active:scale-[0.98] transition-all"
              >
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{cat.emoji} {cat.name}</span>
                  <span className="text-muted-foreground">{fmt(cat.amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {transactions.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">💸</p>
          <p className="text-muted-foreground font-medium">No transactions yet</p>
          <p className="text-muted-foreground text-sm mt-1">Tap + to add your first entry</p>
        </div>
      )}
    </div>
  );
};

const StatBox = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="card-item text-center">
    <div className={`inline-flex items-center gap-1 ${color} mb-1`}>{icon}<span className="text-[10px] font-semibold uppercase">{label}</span></div>
    <p className={`text-sm font-bold ${color}`}>{value}</p>
  </div>
);

const TransactionRow = ({ tx, currency }: { tx: Transaction; currency: string }) => {
  const time = new Date(tx.timestamp).toLocaleTimeString(currency === '₹' ? 'en-IN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="card-item flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg" style={{ backgroundColor: tx.categoryColor + '20' }}>
        {tx.categoryEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{tx.merchant}</p>
        <p className="text-xs text-muted-foreground">{tx.category} · {time}</p>
      </div>
      <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
        {tx.type === 'income' ? '+' : '-'}{currency}{tx.amount.toLocaleString(currency === '₹' ? 'en-IN' : 'en-US')}
      </p>
    </div>
  );
};

export default Dashboard;
