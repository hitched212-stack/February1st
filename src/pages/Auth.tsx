import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { z } from 'zod';
import { Check, Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

// Custom slash logo icon matching dashboard/landing
const SlashLogoIcon = ({
  className
}: {
  className?: string;
}) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="15" y1="5" x2="9" y2="19" />
  </svg>
);

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

interface PasswordRequirement {
  label: string;
  met: boolean;
}

const fadeIn = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const
    }
  }
};

const staggerContainer = {
  hidden: {
    opacity: 0
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

export default function Auth() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const {
    signIn,
    signUp,
    resetPassword,
    user
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check URL params for tab selection
  const forceLogin = searchParams.get('login') === 'true';
  const tabParam = searchParams.get('tab');
  
  useEffect(() => {
    if (tabParam === 'signup') {
      setIsSignUp(true);
    }
  }, [tabParam]);

  useEffect(() => {
    // Only auto-redirect if user is logged in AND not forcing login
    if (user && !forceLogin && !tabParam) {
      navigate('/dashboard');
    }
  }, [user, navigate, forceLogin, tabParam]);

  const passwordRequirements: PasswordRequirement[] = useMemo(() => [{
    label: 'At least 6 characters',
    met: password.length >= 6
  }, {
    label: 'Contains a number',
    met: /\d/.test(password)
  }, {
    label: 'Contains a letter',
    met: /[a-zA-Z]/.test(password)
  }], [password]);

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const metRequirementsCount = passwordRequirements.filter(req => req.met).length;
  const strengthLabel = metRequirementsCount === 3 ? 'Strong' : metRequirementsCount === 2 ? 'Good' : 'Weak';

  const validateInput = () => {
    try {
      authSchema.parse({
        email,
        password
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInput()) return;
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!', {
        className: '!border-[#9b8cff]/45 !bg-[#9b8cff]/14 !text-foreground',
      });
      navigate('/dashboard?returning=true');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInput()) return;
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password, username.trim());
    setIsLoading(false);
    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('An account with this email already exists');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created successfully!');
      navigate('/paywall');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    try {
      z.string().email().parse(resetEmail);
    } catch {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsResetLoading(true);
    const { error } = await resetPassword(resetEmail);
    setIsResetLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent! Check your inbox.');
      setResetDialogOpen(false);
      setResetEmail('');
    }
  };

  const handleSubmit = isSignUp ? handleSignUp : handleSignIn;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4 py-8 text-white">
      {/* Main Content Card */}
      <motion.div 
        className="w-full max-w-[520px] rounded-3xl border border-indigo-500/20 bg-black/60 backdrop-blur-xl p-8 sm:p-12 shadow-2xl shadow-indigo-500/10"
        initial="hidden" 
        animate="visible" 
        variants={staggerContainer}
      >
        {/* Logo */}
        <motion.div variants={fadeIn} className="flex justify-center mb-8">
          <img 
            src="/images/landing-page-logo.png" 
            alt="MyTradeLog" 
            className="h-12 w-auto object-contain"
          />
        </motion.div>

        {/* Title */}
        <motion.div variants={fadeIn} className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-zinc-400 text-base">
            {isSignUp ? "Sign up to get started" : 'Pick up where you left off'}
          </p>
        </motion.div>

        {/* Form */}
        <motion.form 
          variants={fadeIn} 
          onSubmit={handleSubmit} 
          className="space-y-5"
        >
          {/* Username field - only for signup */}
          {isSignUp && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-sm font-medium text-white/90 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <User className="h-5 w-5" />
                </div>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="h-12 rounded-lg border border-indigo-500/30 bg-black/40 pl-12 pr-4 text-white placeholder:text-zinc-500 hover:border-indigo-500/50 hover:bg-black/50 focus-visible:bg-black/50 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                  required={isSignUp}
                />
              </div>
            </motion.div>
          )}

          {/* Email field */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                <Mail className="h-5 w-5" />
              </div>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-12 rounded-lg border border-indigo-500/30 bg-black/40 pl-12 pr-4 text-white placeholder:text-zinc-500 hover:border-indigo-500/50 hover:bg-black/50 focus-visible:bg-black/50 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                <Lock className="h-5 w-5" />
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12 rounded-lg border border-indigo-500/30 bg-black/40 pl-12 pr-12 text-white placeholder:text-zinc-500 hover:border-indigo-500/50 hover:bg-black/50 focus-visible:bg-black/50 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements - only for signup */}
          {isSignUp && password.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg border border-transparent bg-zinc-900/70 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-400">Password strength</p>
                <span
                  className={cn(
                    'text-[9px] font-semibold px-1.5 py-0.5 rounded-full border transition-colors',
                    metRequirementsCount === 3
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : metRequirementsCount === 2
                        ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  )}
                >
                  {strengthLabel} • {metRequirementsCount}/3
                </span>
              </div>

              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    metRequirementsCount === 3
                      ? 'bg-emerald-500'
                      : metRequirementsCount === 2
                        ? 'bg-indigo-500'
                        : 'bg-zinc-500'
                  )}
                  style={{ width: `${(metRequirementsCount / passwordRequirements.length) * 100}%` }}
                />
              </div>

              {passwordRequirements.map((req, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-2.5 transition-all duration-300',
                    req.met
                      ? 'text-emerald-300'
                      : 'text-slate-400'
                  )}
                >
                  <div className={cn(
                    'w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors',
                    req.met ? 'bg-emerald-500' : 'bg-neutral-600'
                  )}>
                    {req.met ? (
                      <Check className="h-2 w-2 text-white" strokeWidth={3} />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-zinc-400" />
                    )}
                  </div>
                  <span 
                    className={cn(
                      'text-[13px] transition-colors',
                      req.met ? 'text-emerald-300' : 'text-slate-400'
                    )}
                  >
                    {req.label}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Forgot Password - only for signin */}
          {!isSignUp && (
            <div className="text-right">
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" type="button" className="h-auto p-0 text-sm text-white/90 hover:text-white transition-colors">
                    Forgot password?
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-2xl border border-transparent bg-zinc-950">
                  <DialogHeader>
                    <DialogTitle className="text-xl text-white">Reset Password</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                      Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                        <Mail className="h-5 w-5" />
                      </div>
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        className="h-12 rounded-lg border border-transparent bg-zinc-900/70 pl-12 pr-4 text-white placeholder:text-zinc-500 hover:bg-zinc-900/70 hover:border-transparent focus-visible:bg-zinc-900/70 focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-lg font-semibold bg-white hover:bg-white/90 text-black"
                      disabled={isResetLoading}
                    >
                      {isResetLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="group relative overflow-hidden w-full h-12 rounded-lg font-bold text-base bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:via-indigo-500 hover:to-purple-500 text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 mt-6"
            disabled={isLoading || (isSignUp && !allRequirementsMet)}
          >
            <span className="flex items-center justify-center relative overflow-hidden h-5">
              <span className="transition-all duration-500 group-hover:translate-y-[-100%]">
                {isLoading 
                  ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                  : (isSignUp ? 'Sign Up' : 'Sign In')
                }
              </span>
              <span className="absolute top-[100%] left-0 transition-all duration-500 group-hover:translate-y-[-100%]">
                {isLoading 
                  ? (isSignUp ? 'Creating account...' : 'Signing in...') 
                  : (isSignUp ? 'Sign Up' : 'Sign In')
                }
              </span>
            </span>
            <span className="absolute top-0 left-[-100%] w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] group-hover:left-[100%] transition-all duration-700" />
          </Button>
        </motion.form>

        {/* Switch Auth Mode */}
        <motion.div variants={fadeIn} className="mt-6 text-center">
          <p className="text-muted-foreground">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword('');
              }}
              className="text-white font-medium hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </motion.div>
      </motion.div>

      {/* Footer - Outside Card */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-sm text-muted-foreground mt-8"
      >
        By continuing, you agree to our{' '}
        <a href="/terms" className="text-white hover:underline">
          Terms and Services
        </a>
      </motion.p>
    </div>
  );
}
