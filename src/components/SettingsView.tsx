import { useState } from 'react';
import { useProfile, useUpdateProfile } from '@/lib/store';
import { ArrowLeft, User, DollarSign, Eye, EyeOff, Wallet, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';

interface SettingsViewProps {
  onBack: () => void;
}

const SettingsView = ({ onBack }: SettingsViewProps) => {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { user } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [budgetValue, setBudgetValue] = useState(String(profile?.monthly_budget || ''));

  const handleSaveProfile = async () => {
    const updates: Record<string, any> = {};
    if (displayName.trim() && displayName !== profile?.display_name) {
      updates.display_name = displayName.trim();
    }
    if (Object.keys(updates).length === 0 && !newPassword) {
      toast({ title: 'No changes to save' });
      return;
    }
    try {
      if (Object.keys(updates).length > 0) {
        await updateProfile.mutateAsync(updates);
      }
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setNewPassword('');
      }
      toast({ title: 'Profile updated!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCurrencyChange = async (c: string) => {
    await updateProfile.mutateAsync({ currency: c });
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

  const handleToggle = async (key: 'budget_enabled' | 'show_recent_activity', value: boolean) => {
    await updateProfile.mutateAsync({ [key]: value });
  };

  if (!profile) return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground">Settings</h2>
      </div>
      <div className="text-center py-16">
        <p className="text-muted-foreground font-medium">Loading settings...</p>
      </div>
    </div>
  );

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground">Settings</h2>
      </div>

      {/* Profile Section */}
      <div className="card-premium mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-primary" />
          <h3 className="text-sm font-display font-semibold text-foreground uppercase tracking-widest">Profile</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-sm text-foreground border border-border focus:border-primary outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 rounded-xl bg-secondary text-sm text-muted-foreground border border-border outline-none opacity-60"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full px-4 py-3 rounded-xl bg-secondary text-sm text-foreground border border-border focus:border-primary outline-none transition-all pr-12"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            onClick={handleSaveProfile}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Save size={16} />
            Save Profile
          </button>
        </div>
      </div>

      {/* Currency Section */}
      <div className="card-premium mb-4">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={18} className="text-primary" />
          <h3 className="text-sm font-display font-semibold text-foreground uppercase tracking-widest">Currency</h3>
        </div>
        <div className="flex gap-3">
          {(['₹', '$'] as const).map(c => (
            <button
              key={c}
              onClick={() => handleCurrencyChange(c)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                profile.currency === c
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {c === '₹' ? '₹ INR' : '$ USD'}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity Toggle */}
      <div className="card-premium mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {profile.show_recent_activity ? <Eye size={18} className="text-primary" /> : <EyeOff size={18} className="text-muted-foreground" />}
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
              <p className="text-xs text-muted-foreground">Show on home page</p>
            </div>
          </div>
          <Switch
            checked={profile.show_recent_activity}
            onCheckedChange={v => handleToggle('show_recent_activity', v)}
          />
        </div>
      </div>

      {/* Monthly Budget Toggle */}
      <div className="card-premium mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className={profile.budget_enabled ? 'text-primary' : 'text-muted-foreground'} />
            <div>
              <h3 className="text-sm font-bold text-foreground">Monthly Budget</h3>
              <p className="text-xs text-muted-foreground">Track spending against a limit</p>
            </div>
          </div>
          <Switch
            checked={profile.budget_enabled}
            onCheckedChange={v => handleToggle('budget_enabled', v)}
          />
        </div>
        {profile.budget_enabled && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3">
              <span className="text-lg font-display font-bold text-muted-foreground">{profile.currency}</span>
              <input
                type="number"
                value={budgetValue}
                onChange={e => setBudgetValue(e.target.value)}
                placeholder="Enter budget amount"
                className="flex-1 bg-transparent text-lg font-display font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            <button
              onClick={handleBudgetSave}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Save size={16} />
              Save Budget
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
