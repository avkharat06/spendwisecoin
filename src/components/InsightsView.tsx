import { TrendingUp, Shield, PieChart, Wallet, Star, AlertTriangle } from 'lucide-react';

const tips = [
  {
    icon: PieChart,
    title: '50/30/20 Rule',
    desc: 'Allocate 50% to needs, 30% to wants, and 20% to savings & investments.',
    color: '#5B4FE8',
  },
  {
    icon: Shield,
    title: 'Emergency Fund',
    desc: 'Build 3-6 months of expenses as a safety net before investing aggressively.',
    color: '#10B981',
  },
  {
    icon: TrendingUp,
    title: 'Start a SIP',
    desc: 'Systematic Investment Plans in index funds can grow your wealth over time with compounding.',
    color: '#F59E0B',
  },
  {
    icon: Wallet,
    title: 'Track Every Rupee',
    desc: 'Small daily expenses add up. Logging everything reveals spending patterns you never noticed.',
    color: '#EC4899',
  },
  {
    icon: Star,
    title: 'Pay Yourself First',
    desc: 'Transfer savings to a separate account on payday, before spending on anything else.',
    color: '#06B6D4',
  },
];

const InsightsView = () => {
  return (
    <div className="animate-in pb-4">
      <h2 className="text-2xl font-black text-foreground mb-1">Insights</h2>
      <p className="text-sm text-muted-foreground mb-6">Smart money tips to grow your wealth</p>

      <div className="space-y-3">
        {tips.map(tip => {
          const Icon = tip.icon;
          return (
            <div key={tip.title} className="card-premium flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: tip.color + '20' }}>
                <Icon size={22} style={{ color: tip.color }} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground mb-1">{tip.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 card-item flex items-start gap-3 border-destructive/30">
        <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-destructive font-bold">Disclaimer:</span> These are general financial tips and not professional advice. Consult a certified financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
};

export default InsightsView;
