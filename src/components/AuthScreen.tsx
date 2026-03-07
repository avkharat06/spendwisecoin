import { useState } from 'react';
import { signIn, signUp, validatePassword } from '@/lib/auth';
import { Eye, EyeOff, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuthScreenProps {
  onAuth: () => void;
}

const AuthScreen = ({ onAuth }: AuthScreenProps) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [budget, setBudget] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const { toast } = useToast();

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup') {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        triggerShake();
        toast({ title: 'Weak Password', description: pwCheck.error, variant: 'destructive' });
        return;
      }
      const result = signUp(name, email, password, 0);
      if (result.success) {
        toast({ title: 'Welcome to SpendWise!', description: 'Your account has been created.' });
        onAuth();
      } else {
        triggerShake();
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } else {
      const result = signIn(email, password);
      if (result.success) {
        toast({ title: 'Welcome back!' });
        onAuth();
      } else {
        triggerShake();
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    }
  };

  const clearFields = () => {
    setName('');
    setEmail('');
    setPassword('');
    setBudget('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20" style={{ background: 'var(--gradient-glow-primary)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-15" style={{ background: 'var(--gradient-glow-accent)' }} />

      <div className={`w-full max-w-sm animate-in ${shake ? 'animate-shake' : ''}`}>
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl gradient-primary glow-primary mb-4">
            <Wallet className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black text-foreground">SpendWise</h1>
          <p className="text-muted-foreground mt-1 text-sm">Smart expense tracking</p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-3xl bg-secondary p-1 mb-8">
          <button
            onClick={() => { setMode('signin'); clearFields(); }}
            className={`flex-1 py-3 rounded-3xl text-sm font-semibold transition-all ${mode === 'signin' ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); clearFields(); }}
            className={`flex-1 py-3 rounded-3xl text-sm font-semibold transition-all ${mode === 'signup' ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-5 py-4 rounded-3xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-all text-sm"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-5 py-4 rounded-3xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-all text-sm"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-5 py-4 rounded-3xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-all text-sm pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {mode === 'signup' && (
            <p className="text-xs text-muted-foreground text-center">
              Password: min 3 letters, 3 numbers, 1 special character
            </p>
          )}
          <button
            type="submit"
            className="w-full py-4 rounded-3xl gradient-primary text-primary-foreground font-bold text-base active:scale-95 transition-all glow-primary"
          >
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
