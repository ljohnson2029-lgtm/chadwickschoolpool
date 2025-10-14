import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Shield, UserPlus } from 'lucide-react';

const Register = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
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
  const [canResend, setCanResend] = useState(true);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkEmail = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('auth-check-email', {
        body: { email }
      });

      if (error) throw error;
      
      if (data.approved) {
        await sendVerificationCode();
        setStep(2);
      } else {
        setError(data.message || 'Email not approved for registration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    setLoading(true);
    setCanResend(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('auth-send-2fa', {
        body: { email }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send code');
      
      toast({
        title: 'Code sent',
        description: 'Check your email for the verification code'
      });

      setTimeout(() => setCanResend(true), 30000);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('auth-verify-2fa', {
        body: { email, code }
      });

      if (error) throw error;
      
      if (data.success) {
        setStep(3);
        toast({
          title: 'Verified',
          description: 'Code verified successfully'
        });
      } else {
        setError(data.error || 'Invalid verification code');
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async () => {
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
      // Create Supabase auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: formData.username,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone_number: formData.phoneNumber || null
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: formData.username,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phoneNumber || null
        });

      if (profileError) throw profileError;

      toast({
        title: 'Success!',
        description: 'Account created successfully. You can now log in.'
      });
      
      navigate('/login');
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
          <p className="text-muted-foreground">Create your account in 3 easy steps</p>
        </div>

        <div className="bg-card border rounded-lg p-8 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {s === 1 && <Mail className="h-5 w-5" />}
                  {s === 2 && <Shield className="h-5 w-5" />}
                  {s === 3 && <UserPlus className="h-5 w-5" />}
                </div>
                {s < 3 && <div className={`h-1 w-16 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Email Verification */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={checkEmail} 
                disabled={loading || !email}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: 2FA Code */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We've sent a 6-digit code to <strong>{email}</strong>
              </p>
              <div>
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="mt-1 text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Attempts remaining: {attemptsRemaining}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={verifyCode}
                  disabled={loading || code.length !== 6}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
                <Button
                  variant="outline"
                  onClick={sendVerificationCode}
                  disabled={!canResend || loading}
                >
                  Resend
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Account Creation */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="3-20 alphanumeric characters"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Min 8 characters"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={createAccount}
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </div>
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
