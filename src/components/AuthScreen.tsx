import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import spendwiseLogo from '@/assets/spendwise-logo.png';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  const validateEmail = (value: string) => {
    if (!value.trim()) { setEmailError('Email is required'); return false; }
    if (!EMAIL_REGEX.test(value.trim())) { setEmailError('Please enter a valid email address'); return false; }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;
    setLoading(true);

    try {
      if (isLogin) {
        const result = await signIn(email.trim(), password);
        if (result.error) throw new Error(result.error);
      } else {
        if (!displayName.trim()) { toast({ title: 'Please enter your name', variant: 'destructive' }); setLoading(false); return; }
        const result = await signUp(email.trim(), password, displayName.trim());
        if (result.error) throw new Error(result.error);
        toast({ title: 'Check your email', description: 'We sent you a verification link to confirm your account.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 relative overflow-hidden">
      {/* Subtle glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full opacity-30 animate-pulse" style={{ background: 'radial-gradient(circle, hsla(199, 91%, 64%, 0.2), transparent 70%)' }} />
        <div className="absolute -bottom-1/4 -right-1/4 w-[50%] h-[50%] rounded-full opacity-20 animate-pulse" style={{ background: 'radial-gradient(circle, hsla(187, 80%, 50%, 0.15), transparent 70%)', animationDelay: '1.5s' }} />
      </div>
      <div className="w-full max-w-sm animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <img src={spendwiseLogo} alt="SpendWise" className="w-16 h-16 mx-auto mb-3 rounded-2xl" />
          <h1 className="font-display text-3xl font-bold text-foreground">SpendWise</h1>
          <p className="text-sm text-muted-foreground mt-1">Track · Save · Grow</p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h2 className="font-display text-xl font-semibold text-foreground mb-1">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {isLogin ? 'Sign in to continue tracking' : 'Start managing your money'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {!isLogin && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" className="bg-secondary border-border" required />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value); }}
                onBlur={() => email && validateEmail(email)}
                placeholder="you@example.com"
                className={`bg-secondary border-border ${emailError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                required
              />
              {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Password</label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="bg-secondary border-border pr-10" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 font-display gap-2">
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight size={16} />
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setEmailError(''); }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
