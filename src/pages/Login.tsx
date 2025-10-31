import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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
      // Step 1: Verify email/password
      const { data: loginData, error: loginError } = await supabase.functions.invoke('auth-login', {
        body: { usernameOrEmail: email, password }
      });

      if (loginError || !loginData?.success) {
        throw new Error(loginData?.error || 'Invalid email or password');
      }

      // Step 2: Send 2FA code
      const { data: codeData, error: codeError } = await supabase.functions.invoke('auth-send-2fa', {
        body: { email }
      });

      if (codeError || !codeData?.success) {
        throw new Error('Failed to send verification code');
      }

      // Show code input screen
      setShowCodeInput(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verify the 2FA code
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('auth-verify-2fa', {
        body: { email, code }
      });

      if (verifyError || !verifyData?.success) {
        setAttemptsRemaining(verifyData?.attemptsRemaining ?? 0);
        throw new Error(verifyData?.error || 'Invalid verification code');
      }

      // Sign in with Supabase auth
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-text mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Log in to your SchoolPool account</p>
        </div>

        {!showCodeInput ? (
          <form onSubmit={handleLogin} className="bg-card border rounded-lg p-8 space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>

            <div className="text-center space-y-2">
              <Button variant="link" className="text-sm">
                Forgot Password?
              </Button>
              <div className="text-sm">
                Don't have an account?{' '}
                <Button variant="link" onClick={() => navigate('/register')} className="p-0">
                  Sign Up
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="bg-card border rounded-lg p-8 space-y-6">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                We've sent a verification code to <strong>{email}</strong>
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                  {attemptsRemaining > 0 && ` (${attemptsRemaining} attempts remaining)`}
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="code">Verification Code</Label>
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

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Log In
            </Button>

            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => {
                  setShowCodeInput(false);
                  setCode('');
                  setError('');
                  setAttemptsRemaining(3);
                }}
                className="text-sm"
              >
                Back to login
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;