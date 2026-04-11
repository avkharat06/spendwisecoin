import { useState, useEffect } from 'react';
import { useProfile, useUpdateProfile } from '@/lib/store';
import { ArrowLeft, Eye, EyeOff, Wallet, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

interface PreferencesSectionProps {
  onBack: () => void;
}

const PreferencesSection = ({ onBack }: PreferencesSectionProps) => {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [budgetValue, setBudgetValue] = useState('');

  useEffect(() => {
    if (profile) {
      setBudgetValue(String(profile.monthly_budget || ''));
    }
  }, [profile]);

  const handleToggle = async (key: 'budget_enabled' | 'show_recent_activity' | 'show_running_balance', value: boolean) => {
    await updateProfile.mutateAsync({ [key]: value });
  };

  const handleBudgetSave = async () => {
    const val = parseFloat(budgetValue);
    if (isNaN(val) || val < 0) {
      toast({ title: 'Enter a valid budget amount' });
      return;
    }
    await updateProfile.mutateAsync({ monthly_budget: val });
    toast({ title: 'Budget updated!' });
  };

  if (!profile) return null;

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground">Preferences</h2>
      </div>

      {/* Recent Activity Toggle */}
      <div className="rounded-xl bg-card p-5 border border-border mb-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {profile.show_recent_activity ? <Eye size={18} className="text-primary" /> : <EyeOff size={18} className="text-muted-foreground" />}
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
              <p className="text-xs text-muted-foreground">Show on home page</p>
            </div>
          </div>
          <Switch checked={profile.show_recent_activity} onCheckedChange={v => handleToggle('show_recent_activity', v)} />
        </div>
      </div>

      {/* Running Balance Toggle */}
      <div className="rounded-xl bg-card p-5 border border-border mb-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={18} className={(profile as any)?.show_running_balance !== false ? 'text-primary' : 'text-muted-foreground'} />
            <div>
              <h3 className="text-sm font-bold text-foreground">Running Balance</h3>
              <p className="text-xs text-muted-foreground">Show balance per transaction in history</p>
            </div>
          </div>
          <Switch checked={(profile as any)?.show_running_balance !== false} onCheckedChange={v => handleToggle('show_running_balance' as any, v)} />
        </div>
      </div>

      {/* Monthly Budget Toggle */}
      <div className="rounded-xl bg-card p-5 border border-border mb-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className={profile.budget_enabled ? 'text-primary' : 'text-muted-foreground'} />
            <div>
              <h3 className="text-sm font-bold text-foreground">Monthly Budget</h3>
              <p className="text-xs text-muted-foreground">Track spending against a limit</p>
            </div>
          </div>
          <Switch checked={profile.budget_enabled} onCheckedChange={v => handleToggle('budget_enabled', v)} />
        </div>
        {profile.budget_enabled && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3">
              <span className="text-lg font-display font-bold text-muted-foreground">{profile.currency}</span>
              <input type="number" value={budgetValue} onChange={e => setBudgetValue(e.target.value)} placeholder="Enter budget amount" className="flex-1 bg-transparent text-lg font-display font-bold text-foreground outline-none placeholder:text-muted-foreground/50" />
            </div>
            <button onClick={handleBudgetSave} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
              <Save size={16} />
              Save Budget
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreferencesSection;
