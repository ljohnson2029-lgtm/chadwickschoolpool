import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import WelcomeModal from '@/components/WelcomeModal';
import AddressRequiredModal from '@/components/AddressRequiredModal';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [actualEmail, setActualEmail] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [userAccountType, setUserAccountType] = useState<'student' | 'parent' | 'staff'>('parent');
  const [userFirstName, setUserFirstName] = useState('');
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  
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

      setActualEmail(loginData.user.email);
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
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('auth-verify-2fa', {
        body: { email: actualEmail, code: code.trim() }
      });

      if (verifyError || !verifyData?.success) {
        setAttemptsRemaining(verifyData?.attemptsRemaining ?? 0);
        throw new Error(verifyData?.error || 'Invalid verification code');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: actualEmail,
        password,
      });

      if (signInError) throw signInError;
      
      // Check profile setup and first login
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('home_address, account_type, first_name')
          .eq('id', authUser.id)
          .maybeSingle();

        // Store user info for modals
        setLoggedInUserId(authUser.id);
        setUserAccountType((profileData?.account_type as 'student' | 'parent' | 'staff') || 'parent');
        setUserFirstName(profileData?.first_name || '');

        const isParentOrStaff = profileData?.account_type === 'parent' || profileData?.account_type === 'staff';
        const needsAddress = !profileData?.home_address;

        // For parents/staff without address, show address modal
        if (isParentOrStaff && needsAddress) {
          setShowAddressModal(true);
          return;
        }

        // For students without address, show welcome modal then navigate
        if (profileData?.account_type === 'student' && needsAddress) {
          setShowWelcomeModal(true);
          return;
        }
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
    navigate('/family-links');
  };

  const handleAddressAdded = () => {
    setShowAddressModal(false);
    navigate('/dashboard');
  };

  return (
    <>
      <Navigation />
      <WelcomeModal 
        open={showWelcomeModal} 
        onClose={handleWelcomeModalClose}
        accountType={userAccountType}
        firstName={userFirstName}
      />
      {loggedInUserId && (
        <AddressRequiredModal
          open={showAddressModal}
          userId={loggedInUserId}
          onAddressAdded={handleAddressAdded}
        />
      )}
      <div className="min-h-screen flex items-center justify-center hero-gradient px-4 page-transition pt-16 sm:pt-20 pb-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blob" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blob" style={{ animationDelay: "5s" }} />
      </div>
      
      <div className="relative z-10 w-full max-w-md space-y-6 sm:space-y-8 animate-fade-up">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-2">Welcome Back</h1>
          <p className="text-sm sm:text-base text-primary-foreground/80">Log in to your SchoolPool account</p>
        </div>

        {!showCodeInput ? (
          <form onSubmit={handleLogin} className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email" className="text-foreground text-sm sm:text-base">Email or Username</Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email or username"
                required
                className="mt-1 h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-foreground text-sm sm:text-base">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>

            <LoadingButton 
              type="submit" 
              loading={loading}
              loadingText="Signing in..."
              className="w-full h-12 sm:h-11 text-base sm:text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-300"
            >
              Continue
            </LoadingButton>

            <div className="text-center space-y-2">
              <Button variant="ghost" className="text-sm text-foreground/70 hover:text-foreground h-10">
                Forgot Password?
              </Button>
              <p className="text-sm text-foreground/70">
                Don't have an account?{' '}
                <Button variant="ghost" onClick={() => navigate('/register')} className="p-0 h-auto font-semibold text-primary hover:text-primary/80">
                  Sign up
                </Button>
              </p>
              <p className="text-sm text-foreground/70">
                Don't have access?{' '}
                <Button variant="ghost" onClick={() => navigate('/request-access')} className="p-0 h-auto font-semibold text-primary hover:text-primary/80">
                  Request Access
                </Button>
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl animate-fade-in">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                  {attemptsRemaining > 0 && ` (${attemptsRemaining} attempts remaining)`}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-center">
              <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl">📧</span>
              </div>
              <p className="text-sm text-muted-foreground">
                We've sent a verification code to your email
              </p>
            </div>

            <div>
              <Label htmlFor="code" className="text-foreground text-sm sm:text-base">Verification Code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                className="mt-1 text-center text-xl sm:text-2xl tracking-widest h-12 sm:h-auto"
              />
            </div>

            <LoadingButton 
              type="submit" 
              loading={loading}
              loadingText="Verifying..."
              className="w-full h-12 sm:h-11 text-base sm:text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-300"
            >
              Verify & Log In
            </LoadingButton>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCodeInput(false);
                setCode('');
                setError('');
              }}
              className="w-full text-foreground/70 hover:text-foreground h-10"
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
