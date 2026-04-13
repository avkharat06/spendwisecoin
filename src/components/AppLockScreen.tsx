import { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AppLockScreenProps {
  lockType: 'pin' | 'password' | 'biometric';
  storedPin: string | null;
  storedPassword: string | null;
  onUnlock: () => void;
}

const AppLockScreen = ({ lockType, storedPin, storedPassword, onUnlock }: AppLockScreenProps) => {
  const [value, setValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = () => {
    setError('');
    if (lockType === 'pin') {
      if (value === storedPin) {
        onUnlock();
      } else {
        setError('Incorrect PIN');
        setValue('');
      }
    } else if (lockType === 'password') {
      if (value === storedPassword) {
        onUnlock();
      } else {
        setError('Incorrect password');
        setValue('');
      }
    }
  };

  const handleBiometric = async () => {
    setLoading(true);
    setError('');
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
          allowCredentials: [],
        },
      });
      if (credential) {
        onUnlock();
      }
    } catch {
      setError('Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Lock size={28} className="text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">SpendWise Locked</h1>
          <p className="text-sm text-muted-foreground">
            {lockType === 'biometric' ? 'Authenticate to continue' : `Enter your ${lockType === 'pin' ? 'PIN' : 'password'} to unlock`}
          </p>
        </div>

        {lockType === 'pin' && (
          <Input
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={value}
            onChange={e => setValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={handleKeyDown}
            placeholder="••••"
            className="text-center tracking-[0.5em] text-2xl rounded-xl h-14"
            autoFocus
          />
        )}

        {lockType === 'password' && (
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter password"
              className="rounded-xl h-14 pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-destructive font-medium">{error}</p>}

        {lockType === 'biometric' ? (
          <button
            onClick={handleBiometric}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Authenticate
          </button>
        ) : (
          <button
            onClick={handleUnlock}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm active:scale-95 transition-all"
          >
            Unlock
          </button>
        )}
      </div>
    </div>
  );
};

export default AppLockScreen;
