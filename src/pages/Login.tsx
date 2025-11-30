import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import Navigation from '@/components/Navigation';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: loginData, error: loginError } = await supabase.functions.invoke('auth-login', {
        body: { 
          usernameOrEmail: email.toLowerCase().trim(),
          password 
        }
      });

      if (loginError || !loginData?.success) {
        throw new Error('Invalid email/username or password');
      }

      const { data: codeData, error: codeError } = await supabase.functions.invoke('auth-send-2fa', {
        body: { email: loginData.user.email }
      });

      if (codeError || !codeData?.success) {
        throw new Error('Failed to send verification code');
      }

      setShowCodeInput(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Invalid email/username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const normalizedEmail = email.toLowerCase().trim();

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('auth-verify-2fa', {
        body: { email: normalizedEmail, code: code.trim() }
      });

      if (verifyError || !verifyData?.success) {
        setAttemptsRemaining(verifyData?.attemptsRemaining ?? 0);
        throw new Error(verifyData?.error || 'Invalid verification code');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) throw signInError;
      
      // Check if user is a student
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'student')
          .maybeSingle();

        if (roleData) {
          // Check if student has approved parent link
          const { data: linkData } = await supabase
            .from('student_parent_links')
            .select('status')
            .eq('student_id', user.id)
            .eq('status', 'approved')
            .maybeSingle();

          if (!linkData) {
            // Student without approved parent link
            navigate('/family-links');
            return;
          }
        }
      }
      
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center hero-gradient px-4 page-transition pt-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blob" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blob" style={{ animationDelay: "5s" }} />
      </div>
      
      <div className="relative z-10 w-full max-w-md space-y-8 animate-fade-up">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-foreground mb-2">Welcome Back</h1>
          <p className="text-primary-foreground/80">Log in to your SchoolPool account</p>
        </div>

        {!showCodeInput ? (
          <form onSubmit={handleLogin} className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl p-8 space-y-6 shadow-2xl">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email" className="text-foreground">Email or Username</Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email or username"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-300"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>

            <div className="text-center space-y-2">
              <Button variant="ghost" className="text-sm text-foreground/70 hover:text-foreground">
                Forgot Password?
              </Button>
              <p className="text-sm text-foreground/70">
                Don't have an account?{' '}
                <Button variant="ghost" onClick={() => navigate('/register')} className="p-0 h-auto font-semibold text-primary hover:text-primary/80">
                  Sign up
                </Button>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl p-8 space-y-6 shadow-2xl animate-fade-in">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                  {attemptsRemaining > 0 && ` (${attemptsRemaining} attempts remaining)`}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📧</span>
              </div>
              <p className="text-sm text-muted-foreground">
                We've sent a verification code to your email
              </p>
            </div>

            <div>
              <Label htmlFor="code" className="text-foreground">Verification Code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                className="mt-1 text-center text-2xl tracking-widest"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-300"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Log In
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCodeInput(false);
                setCode('');
                setError('');
              }}
              className="w-full text-foreground/70 hover:text-foreground"
            >
              ← Back to login
            </Button>
          </form>
        )}
      </div>
    </div>
    </>
  );
};

export default Login;
