import { useState } from 'react';
import { getActiveUser, getCurrency, setCurrency as setCurrencyPref, updateBudget, updateProfile, getPrefs, setPrefs, validatePassword, UserPrefs } from '@/lib/auth';
import { ArrowLeft, User, DollarSign, Eye, EyeOff, Wallet, Lock, Mail, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

interface SettingsViewProps {
  onBack: () => void;
  onRefresh: () => void;
}

const SettingsView = ({ onBack, onRefresh }: SettingsViewProps) => {
  const user = getActiveUser();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [currency, setCurrencyState] = useState(getCurrency());
  const [prefs, setPrefsState] = useState(getPrefs());
  const [budgetValue, setBudgetValue] = useState(String(user?.monthlyBudget || ''));

  const updatePref = (p: Partial<UserPrefs>) => {
    const updated = { ...prefs, ...p };
    setPrefs(p);
    setPrefsState(updated);
    onRefresh();
  };

  const handleSaveProfile = () => {
    const updates: Partial<{ name: string; email: string; password: string }> = {};
    if (name.trim() && name !== user?.name) updates.name = name.trim();
    if (email.trim() && email !== user?.email) updates.email = email.trim();
    if (newPassword) {
      const pwCheck = validatePassword(newPassword);
      if (!pwCheck.valid) {
        toast({ title: 'Weak Password', description: pwCheck.error, variant: 'destructive' });
        return;
      }
      updates.password = newPassword;
    }
    if (Object.keys(updates).length === 0) {
      toast({ title: 'No changes to save' });
      return;
    }
    const result = updateProfile(updates);
    if (result.success) {
      setNewPassword('');
      onRefresh();
      toast({ title: 'Profile updated!' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleCurrencyChange = (c: '₹' | '$') => {
    setCurrencyPref(c);
    setCurrencyState(c);
    onRefresh();
  };

  const handleBudgetSave = () => {
    const val = parseFloat(budgetValue);
    if (isNaN(val) || val < 0) {
      toast({ title: 'Enter a valid budget amount' });
      return;
    }
    updateBudget(val);
    onRefresh();
    toast({ title: 'Budget updated!' });
  };

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-2xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-black text-foreground">Settings</h2>
      </div>

      {/* Profile Section */}
      <div className="card-premium mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Profile</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm text-foreground border border-border focus:border-primary outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
              <Mail size={12} /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm text-foreground border border-border focus:border-primary outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block flex items-center gap-1">
              <Lock size={12} /> New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm text-foreground border border-border focus:border-primary outline-none transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Min 3 letters, 3 numbers, 1 special character</p>
          </div>
          <button
            onClick={handleSaveProfile}
            className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
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
          <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Currency</h3>
        </div>
        <div className="flex gap-3">
          {(['₹', '$'] as const).map(c => (
            <button
              key={c}
              onClick={() => handleCurrencyChange(c)}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                currency === c
                  ? 'gradient-primary text-primary-foreground'
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
            {prefs.showRecentActivity ? <Eye size={18} className="text-primary" /> : <EyeOff size={18} className="text-muted-foreground" />}
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
              <p className="text-xs text-muted-foreground">Show on home page</p>
            </div>
          </div>
          <Switch
            checked={prefs.showRecentActivity}
            onCheckedChange={v => updatePref({ showRecentActivity: v })}
          />
        </div>
      </div>

      {/* Monthly Budget Toggle */}
      <div className="card-premium mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className={prefs.budgetEnabled ? 'text-primary' : 'text-muted-foreground'} />
            <div>
              <h3 className="text-sm font-bold text-foreground">Monthly Budget</h3>
              <p className="text-xs text-muted-foreground">Track spending against a limit</p>
            </div>
          </div>
          <Switch
            checked={prefs.budgetEnabled}
            onCheckedChange={v => updatePref({ budgetEnabled: v })}
          />
        </div>
        {prefs.budgetEnabled && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3">
              <span className="text-lg font-bold text-muted-foreground">{currency}</span>
              <input
                type="number"
                value={budgetValue}
                onChange={e => setBudgetValue(e.target.value)}
                placeholder="Enter budget amount"
                className="flex-1 bg-transparent text-lg font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
              />
            </div>
            <button
              onClick={handleBudgetSave}
              className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
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
