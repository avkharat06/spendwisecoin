import { useMemo, useState } from 'react';
import { useTransactions, useProfile } from '@/lib/store';
import { AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DashboardProps {
  onFilterView?: (filter: 'expense' | 'income' | 'all') => void;
  onCategoryView?: (category: string) => void;
}

const Dashboard = ({ onFilterView, onCategoryView }: DashboardProps) => {
  const { data: profile } = useProfile();
  const { data: transactions = [] } = useTransactions();

  const currency = profile?.currency || '₹';
  const locale = currency === '₹' ? 'en-IN' : 'en-US';
  const showRecentActivity = profile?.show_recent_activity ?? true;
  const budgetEnabled = profile?.budget_enabled ?? true;
  const monthlyBudget = profile?.monthly_budget ?? 0;

  const fmt = (n: number) => currency + Math.abs(n).toLocaleString(locale);

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    weekStart.setHours(0, 0, 0, 0);

    let todaySpent = 0, weekSpent = 0, monthSpent = 0;
    let todayIncome = 0, weekIncome = 0, monthIncome = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date + 'T00:00:00');
      if (tx.type === 'expense') {
        if (tx.date === today) todaySpent += tx.amount;
        if (txDate >= weekStart) weekSpent += tx.amount;
        if (txDate >= monthStart) monthSpent += tx.amount;
      } else {
        if (tx.date === today) todayIncome += tx.amount;
        if (txDate >= weekStart) weekIncome += tx.amount;
        if (txDate >= monthStart) monthIncome += tx.amount;
      }
    });

    const budgetUsage = monthlyBudget > 0 ? (monthSpent / monthlyBudget) * 100 : 0;
    return { todaySpent, weekSpent, monthSpent, todayIncome, weekIncome, monthIncome, budgetUsage };
  }, [transactions, monthlyBudget]);

  type BreakdownPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
  const [breakdownPeriod, setBreakdownPeriod] = useState<BreakdownPeriod>('monthly');

  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (breakdownPeriod) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly': {
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const expenses = transactions.filter(t => t.type === 'expense' && new Date(t.date + 'T00:00:00') >= startDate);
    const grouped: Record<string, { amount: number; emoji: string; color: string }> = {};
    expenses.forEach(tx => {
      if (!grouped[tx.category]) grouped[tx.category] = { amount: 0, emoji: tx.category_emoji, color: tx.category_color };
      grouped[tx.category].amount += tx.amount;
    });
    return Object.entries(grouped)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, breakdownPeriod]);

  const topCategory = categoryBreakdown[0];
  const recentTx = transactions.slice(0, 5);

  return (
    <div className="animate-in space-y-5 pb-4">
      {/* Greeting */}
      <div>
        <p className="text-muted-foreground text-sm">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},
        </p>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {profile?.display_name?.split(' ')[0] || 'User'}
        </h2>
      </div>

      {/* Spent Row */}
      <div>
        <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-2">Spent</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Today', value: stats.todaySpent },
            { label: 'This Week', value: stats.weekSpent },
            { label: 'This Month', value: stats.monthSpent },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => onFilterView?.('expense')}
              className="rounded-xl bg-card p-3.5 border border-border text-left active:scale-95 transition-all"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-base font-display font-bold text-destructive">{fmt(item.value)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Income Row */}
      <div>
        <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">Income</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Today', value: stats.todayIncome },
            { label: 'This Week', value: stats.weekIncome },
            { label: 'This Month', value: stats.monthIncome },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => onFilterView?.('income')}
              className="rounded-xl bg-card p-3.5 border border-border text-left active:scale-95 transition-all"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-base font-display font-bold text-primary">{fmt(item.value)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Breakdown — Donut Chart + Legend */}
      {categoryBreakdown.length > 0 && (
      <div className="rounded-xl bg-card p-5 border border-border" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm text-muted-foreground">
              {breakdownPeriod === 'daily' ? 'Daily' : breakdownPeriod === 'weekly' ? 'Weekly' : breakdownPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Breakdown
            </h3>
            <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
              {(['daily', 'weekly', 'monthly', 'yearly'] as BreakdownPeriod[]).map(period => (
                <button
                  key={period}
                  onClick={() => setBreakdownPeriod(period)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                    breakdownPeriod === period
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="amount"
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {categoryBreakdown.map((cat, i) => (
                      <Cell key={i} fill={cat.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold text-foreground">{d.emoji} {d.name}</p>
                          <p className="text-muted-foreground">{fmt(d.amount)}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5">
              {categoryBreakdown.slice(0, 4).map(cat => (
                <button
                  key={cat.name}
                  onClick={() => onCategoryView?.(cat.name)}
                  className="w-full flex items-center justify-between text-sm active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-foreground">{cat.name}</span>
                  </div>
                  <span className="text-muted-foreground font-display font-semibold">{fmt(cat.amount)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top spending insight — inside pie chart card */}
          {topCategory && (
            <div className="mt-4 px-3 py-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-primary font-medium">
                💡 You spent the most on <strong>{topCategory.name}</strong> {breakdownPeriod === 'daily' ? 'today' : breakdownPeriod === 'weekly' ? 'this week' : breakdownPeriod === 'yearly' ? 'this year' : 'this month'} — {fmt(topCategory.amount)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Budget Progress */}
      {budgetEnabled && monthlyBudget > 0 && (
        <div className="rounded-xl bg-card p-5 border border-border" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground font-medium">Budget Used</span>
            <span className={`font-bold ${stats.budgetUsage > 90 ? 'text-destructive' : 'text-primary'}`}>
              {Math.round(stats.budgetUsage)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${stats.budgetUsage > 90 ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${Math.min(stats.budgetUsage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {fmt(stats.monthSpent)} of {fmt(monthlyBudget)}
          </p>
        </div>
      )}

      {/* Recent Activity */}
      {showRecentActivity && recentTx.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentTx.map(tx => (
              <div key={tx.id} className="rounded-xl bg-card p-3 border border-border flex items-center gap-3" style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: tx.category_color + '20' }}>
                  {tx.category_emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{tx.merchant}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.category} · {new Date(tx.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className={`text-sm font-display font-bold ${tx.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                  {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alarming Messages — Bottom */}
      <div className="space-y-2">
        {budgetEnabled && monthlyBudget > 0 && stats.budgetUsage > 80 && (
          <div className="px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium flex items-center gap-2">
            <AlertTriangle size={14} className="flex-shrink-0" />
            {stats.budgetUsage >= 100
              ? `Budget exceeded! You've spent ${fmt(stats.monthSpent)} of ${fmt(monthlyBudget)}`
              : `Warning: You've used ${Math.round(stats.budgetUsage)}% of your monthly budget`}
          </div>
        )}
        {stats.monthSpent > stats.monthIncome && stats.monthIncome > 0 && (
          <div className="px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium flex items-center gap-2">
            <AlertTriangle size={14} className="flex-shrink-0" />
            Your spending exceeds your income by {fmt(stats.monthSpent - stats.monthIncome)} this month
          </div>
        )}
      </div>

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

export default Dashboard;
