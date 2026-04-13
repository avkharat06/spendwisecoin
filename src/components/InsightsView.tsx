import { useState, useEffect } from 'react';
import { TrendingUp, Shield, PieChart, Wallet, Star, AlertTriangle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface MarketSuggestion {
  stock: string;
  suggestion: string;
  reason: string;
  risk_level: 'Low' | 'Medium' | 'High';
}

const CACHE_KEY = 'market_insights_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const getCached = (): MarketSuggestion[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp < CACHE_DURATION) return data;
    localStorage.removeItem(CACHE_KEY);
  } catch {}
  return null;
};

const setCache = (data: MarketSuggestion[]) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
};

const riskColor = (level: string) => {
  switch (level) {
    case 'Low': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    case 'Medium': return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30';
    case 'High': return 'bg-red-500/15 text-red-600 border-red-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

const InsightsView = () => {
  const [suggestions, setSuggestions] = useState<MarketSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { toast } = useToast();

  const fetchSuggestions = async () => {
    const cached = getCached();
    if (cached) {
      setSuggestions(cached);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('market-insights');
      if (fnError) throw fnError;
      if (Array.isArray(data) && data.length > 0) {
        setSuggestions(data);
        setCache(data);
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err: any) {
      setError(true);
      toast({ title: err.message || 'Failed to fetch suggestions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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

      {/* Market Insights Section */}
      <div className="mt-8">
        <h3 className="text-xl font-black text-foreground mb-1">Market Insights 📈</h3>
        <p className="text-sm text-muted-foreground mb-4">AI-powered stock market suggestions</p>

        {!suggestions && !loading && !error && (
          <button
            onClick={fetchSuggestions}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <TrendingUp size={16} />
            Get Suggestions
          </button>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl bg-card border border-border/50 p-4 space-y-2" style={{ boxShadow: 'var(--shadow-card)' }}>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">Failed to load suggestions</p>
            <button
              onClick={fetchSuggestions}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 mx-auto active:scale-95 transition-all"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          </div>
        )}

        {suggestions && (
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border/50 p-4 space-y-2" style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">{s.stock}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskColor(s.risk_level)}`}>
                    {s.risk_level}
                  </span>
                </div>
                <p className="text-xs text-foreground/80">{s.suggestion}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.reason}</p>
              </div>
            ))}

            <button
              onClick={() => { localStorage.removeItem(CACHE_KEY); setSuggestions(null); }}
              className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCw size={12} />
              Refresh suggestions
            </button>
          </div>
        )}

        {/* AI Disclaimer */}
        <div className="mt-4 p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
          <p className="text-sm font-bold text-destructive leading-relaxed text-center">
            ⚠️ THESE ARE ONLY AI SUGGESTIONS. PLEASE CONSULT A CERTIFIED FINANCIAL ADVISOR BEFORE MAKING ANY INVESTMENT DECISIONS.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsightsView;
