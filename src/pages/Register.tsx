import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Register = () => {
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailApproved, setEmailApproved] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  const checkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email ends with @chadwickschool.org
      const isChadwickEmail = normalizedEmail.endsWith('@chadwickschool.org');
      
      if (isChadwickEmail) {
        setEmailApproved(true);
        toast({
          title: 'Email verified',
          description: 'Your Chadwick email is approved. Please complete your registration.'
        });
        setLoading(false);
        return;
      }

      // If not a Chadwick email, check if it's in the approved_emails table (case-insensitive)
      const { data, error: dbError } = await supabase
        .from('approved_emails')
        .select('email')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (dbError) throw dbError;
      
      if (data) {
        setEmailApproved(true);
        toast({
          title: 'Email verified',
          description: 'Your email is approved. Please complete your registration.'
        });
      } else {
        setError('This email is not approved for registration. Please contact your administrator.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!showCodeInput) {
      // Validate base fields before sending code
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (!formData.firstName || !formData.lastName || !formData.username) {
        setError('First Name, Last Name, and Username are required');
        return;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const normalizedEmail = email.toLowerCase().trim();
        const { data, error: sendError } = await supabase.functions.invoke('auth-send-2fa', {
          body: { email: normalizedEmail },
        });
        if (sendError || data?.success === false) {
          throw new Error(data?.error || sendError?.message || 'Failed to send verification code');
        }
        setShowCodeInput(true);
        toast({ title: 'Verification code sent', description: 'Check your inbox for a 6-digit code.' });
      } catch (err: any) {
        console.error('Send code error:', err);
        setError(err.message || 'Failed to send verification code');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Verify code and then create the account
    if (!code || code.trim().length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('auth-verify-2fa', {
        body: { email: normalizedEmail, code: code.trim() },
      });
      if (verifyError || verifyData?.success === false) {
        setAttemptsRemaining((prev) => prev - 1);
        throw new Error(verifyData?.error || verifyError?.message || 'Invalid verification code');
      }

      // Create auth user after successful verification
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: formData.username,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone_number: formData.phoneNumber || null,
            email_verified_at: new Date().toISOString(),
          },
        },
      });
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create user');

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: formData.username,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phoneNumber || null,
        });
      if (profileError) throw profileError;

      toast({ title: 'Success!', description: 'Account created successfully.' });
      navigate('/profile');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-text mb-2">Join SchoolPool</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        <div className="bg-card border rounded-lg p-8 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!emailApproved ? (
            <form onSubmit={checkEmail} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only approved emails can register
                </p>
              </div>
              <Button 
                type="submit"
                disabled={loading || !email}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Email
              </Button>
            </form>
          ) : (
            <form onSubmit={createAccount} className="space-y-4">
              <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary font-medium">{email}</p>
              </div>

              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Choose a username"
                  required
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="Your phone number"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter your password"
                  required
                  className="mt-1"
                />
              </div>

              {showCodeInput && (
                <div>
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="mt-1 tracking-widest text-center"
                    required
                  />
                  {attemptsRemaining < 5 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Attempts remaining: {attemptsRemaining}
                    </p>
                  )}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {showCodeInput ? 'Verify Code & Create Account' : 'Send Verification Code'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEmailApproved(false);
                  setShowCodeInput(false);
                  setCode('');
                  setError('');
                }}
                className="w-full"
              >
                Change Email
              </Button>
            </form>
          )}

          <div className="text-center text-sm">
            Already have an account?{' '}
            <Button variant="link" onClick={() => navigate('/login')} className="p-0">
              Log In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
