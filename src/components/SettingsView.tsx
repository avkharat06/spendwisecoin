import { useState, useEffect, useRef } from 'react';
import { useProfile, useUpdateProfile, useCustomCategories } from '@/lib/store';
import { ArrowLeft, User, Eye, EyeOff, Wallet, Save, Camera, Pencil, Tag, Trash2, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import EditCategoryModal from './EditCategoryModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SettingsViewProps {
  onBack: () => void;
}

const SettingsView = ({ onBack }: SettingsViewProps) => {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { user } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [budgetValue, setBudgetValue] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; emoji: string; color: string; type?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: customCategories = [] } = useCustomCategories();
  const queryClient = useQueryClient();
  const [clearTarget, setClearTarget] = useState<'transactions' | 'categories' | 'all' | null>(null);
  const [clearing, setClearing] = useState(false);

  const handleClearData = async () => {
    if (!clearTarget || !user) return;
    setClearing(true);
    try {
      if (clearTarget === 'transactions' || clearTarget === 'all') {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id);
        if (error) throw error;
      }
      if (clearTarget === 'categories' || clearTarget === 'all') {
        const { error } = await supabase
          .from('custom_categories')
          .delete()
          .eq('user_id', user.id);
        if (error) throw error;
      }
      if (clearTarget === 'all') {
        await updateProfile.mutateAsync({
          monthly_budget: 0,
          budget_enabled: true,
          show_recent_activity: true,
          show_running_balance: true,
        });
        setBudgetValue('0');
      }
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: clearTarget === 'transactions' ? 'All transactions cleared! 🗑️' : clearTarget === 'categories' ? 'Custom categories cleared! 🗑️' : 'All data reset! 🗑️' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setClearing(false);
      setClearTarget(null);
    }
  };

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBudgetValue(String(profile.monthly_budget || ''));
    }
  }, [profile]);

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

  const handleBudgetSave = async () => {
    const val = parseFloat(budgetValue);
    if (isNaN(val) || val < 0) {
      toast({ title: 'Enter a valid budget amount' });
      return;
    }
    await updateProfile.mutateAsync({ monthly_budget: val });
    toast({ title: 'Budget updated!' });
  };

  const handleToggle = async (key: 'budget_enabled' | 'show_recent_activity' | 'show_running_balance', value: boolean) => {
    await updateProfile.mutateAsync({ [key]: value });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Please upload a JPG, PNG, or WebP image', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Image must be under 2MB', variant: 'destructive' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      await updateProfile.mutateAsync({ avatar_url: avatarUrl });
      toast({ title: 'Profile photo updated! 📸' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getInitials = () => {
    if (!profile?.display_name) return '?';
    return profile.display_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
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
  }

  if (!profile) {
    return (
      <div className="animate-in pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <h2 className="text-2xl font-display font-bold text-foreground">Settings</h2>
        </div>
        <div className="text-center py-16">
          <p className="text-4xl mb-3">⚙️</p>
          <p className="text-muted-foreground font-medium">Unable to load settings</p>
          <p className="text-muted-foreground text-sm mt-1">Please try signing out and back in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-2xl font-display font-bold text-foreground">Settings</h2>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl bg-card p-5 border border-border mb-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-primary" />
          <h3 className="text-sm font-display font-semibold text-foreground uppercase tracking-widest">Profile</h3>
        </div>

        {/* Avatar Upload */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-primary/30">
              <AvatarImage src={(profile as any)?.avatar_url || undefined} alt="Profile" />
              <AvatarFallback className="bg-primary/15 text-primary text-xl font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md active:scale-90 transition-all disabled:opacity-50"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {uploadingAvatar ? 'Uploading...' : 'Tap to change photo'}
          </p>
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
          <Switch
            checked={profile.show_recent_activity}
            onCheckedChange={v => handleToggle('show_recent_activity', v)}
          />
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
          <Switch
            checked={(profile as any)?.show_running_balance !== false}
            onCheckedChange={v => handleToggle('show_running_balance' as any, v)}
          />
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

      {/* Custom Categories */}
      {customCategories.length > 0 && (
        <div className="rounded-xl bg-card p-5 border border-border mb-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Tag size={18} className="text-primary" />
            <h3 className="text-sm font-display font-semibold text-foreground uppercase tracking-widest">My Categories</h3>
          </div>
          <div className="space-y-2">
            {customCategories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-secondary">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: cat.color + '20' }}>
                  {cat.emoji}
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
                <button
                  onClick={() => setEditingCategory({ id: cat.id, name: cat.name, emoji: cat.emoji, color: cat.color, type: (cat as any).type || 'both' })}
                  className="p-1.5 rounded-lg bg-card hover:bg-card/80 active:scale-95 transition-all"
                >
                  <Pencil size={14} className="text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingCategory && (
        <EditCategoryModal category={editingCategory} onClose={() => setEditingCategory(null)} />
      )}

      {/* Clear Data Section */}
      <div className="rounded-xl bg-card p-5 border border-border mb-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Trash2 size={18} className="text-destructive" />
          <h3 className="text-sm font-display font-semibold text-foreground uppercase tracking-widest">Clear Data</h3>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => setClearTarget('transactions')}
            className="w-full py-3 rounded-xl bg-secondary text-sm font-medium text-foreground flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            🗑️ Clear All Transactions
          </button>
          <button
            onClick={() => setClearTarget('categories')}
            className="w-full py-3 rounded-xl bg-secondary text-sm font-medium text-foreground flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            🏷️ Clear Custom Categories
          </button>
          <button
            onClick={() => setClearTarget('all')}
            className="w-full py-3 rounded-xl bg-destructive/10 text-sm font-bold text-destructive flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            ⚠️ Reset All Data
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">This action cannot be undone</p>
      </div>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={!!clearTarget} onOpenChange={open => { if (!open) setClearTarget(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {clearTarget === 'transactions' ? 'Clear All Transactions?' : clearTarget === 'categories' ? 'Clear Custom Categories?' : 'Reset All Data?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clearTarget === 'transactions'
                ? 'This will permanently delete all your transactions. This cannot be undone.'
                : clearTarget === 'categories'
                ? 'This will remove all your custom categories. Default categories will remain.'
                : 'This will delete all transactions, custom categories, and reset settings to defaults. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={clearing}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {clearing ? 'Clearing...' : 'Yes, Clear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsView;
