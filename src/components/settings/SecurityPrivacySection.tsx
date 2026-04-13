import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useProfile, useUpdateProfile } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityPrivacySectionProps {
  onBack: () => void;
}

const SecurityPrivacySection = ({ onBack }: SecurityPrivacySectionProps) => {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  // App Lock state
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockType, setLockType] = useState<'pin' | 'password' | 'biometric'>('pin');
  const [pin, setPin] = useState('');
  const [lockPassword, setLockPassword] = useState('');
  const [showLockPassword, setShowLockPassword] = useState(false);
  const [savingLock, setSavingLock] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setLockEnabled((profile as any).app_lock_enabled ?? false);
      setLockType(((profile as any).app_lock_type as 'pin' | 'password' | 'biometric') ?? 'pin');
      setPin((profile as any).app_lock_pin ?? '');
      setLockPassword((profile as any).app_lock_password ?? '');
    }
  }, [profile]);

  // Check biometric support
  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then(available => setBiometricAvailable(available))
        .catch(() => setBiometricAvailable(false));
    }
  }, []);

  const handleToggleLock = async (enabled: boolean) => {
    setLockEnabled(enabled);
    if (!enabled) {
      await updateProfile.mutateAsync({
        app_lock_enabled: false,
      } as any);
      toast({ title: 'App lock disabled' });
    }
  };

  const handleSaveLock = async () => {
    if (lockType === 'pin') {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        toast({ title: 'Please enter a valid 4-digit PIN' });
        return;
      }
    } else if (lockType === 'password') {
      if (lockPassword.length < 6) {
        toast({ title: 'Password must be at least 6 characters' });
        return;
      }
    }

    setSavingLock(true);
    try {
      await updateProfile.mutateAsync({
        app_lock_enabled: true,
        app_lock_type: lockType,
        app_lock_pin: lockType === 'pin' ? pin : null,
        app_lock_password: lockType === 'password' ? lockPassword : null,
      } as any);
      toast({ title: lockType === 'biometric' ? 'Biometric lock enabled ✓' : `${lockType === 'pin' ? 'PIN' : 'Password'} saved ✓` });
    } catch {
      toast({ title: 'Failed to save lock settings' });
    } finally {
      setSavingLock(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: 'Please fill all password fields' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'New passwords do not match' });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated ✓' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: err.message || 'Failed to update password', variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-secondary active:scale-95 transition-all">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h2 className="text-lg font-display font-bold text-foreground">Security & Privacy</h2>
      </div>

      {/* App Lock Section */}
      <div className="rounded-2xl bg-card border border-border/50 p-5 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-3">
          <Lock size={18} className="text-primary" />
          <h3 className="text-sm font-display font-bold text-foreground">App Lock</h3>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">Enable App Lock</span>
          <Switch checked={lockEnabled} onCheckedChange={handleToggleLock} />
        </div>

        {lockEnabled && (
          <div className="space-y-4 pt-2">
            <RadioGroup value={lockType} onValueChange={(v) => setLockType(v as any)} className="space-y-2">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="pin" id="pin" />
                <Label htmlFor="pin" className="text-sm text-foreground cursor-pointer">PIN</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="password" id="lock-password" />
                <Label htmlFor="lock-password" className="text-sm text-foreground cursor-pointer">Password</Label>
              </div>
              {biometricAvailable && (
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="biometric" id="biometric" />
                  <Label htmlFor="biometric" className="text-sm text-foreground cursor-pointer">Biometric</Label>
                </div>
              )}
            </RadioGroup>

            {lockType === 'pin' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Enter 4-digit PIN</Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="text-center tracking-[0.5em] text-lg rounded-xl"
                />
              </div>
            )}

            {lockType === 'password' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Enter lock password (min 6 chars)</Label>
                <div className="relative">
                  <Input
                    type={showLockPassword ? 'text' : 'password'}
                    value={lockPassword}
                    onChange={e => setLockPassword(e.target.value)}
                    placeholder="Enter password"
                    className="rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLockPassword(!showLockPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showLockPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveLock}
              disabled={savingLock}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {savingLock && <Loader2 size={16} className="animate-spin" />}
              {lockType === 'biometric' ? 'Enable Biometric Lock' : `Save ${lockType === 'pin' ? 'PIN' : 'Password'}`}
            </button>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="rounded-2xl bg-card border border-border/50 p-5 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <h3 className="text-sm font-display font-bold text-foreground">Change Password</h3>

        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showCurrentPw ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="rounded-xl pr-10"
            />
            <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showNewPw ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="rounded-xl pr-10"
            />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="relative">
            <Input
              type={showConfirmPw ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="rounded-xl pr-10"
            />
            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={savingPassword}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {savingPassword && <Loader2 size={16} className="animate-spin" />}
          Save Password
        </button>
      </div>
    </div>
  );
};

export default SecurityPrivacySection;
