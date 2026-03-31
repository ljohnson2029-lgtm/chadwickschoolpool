import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingButton } from '@/components/ui/loading-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';

type Step = 'email' | 'code' | 'newPassword';

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if email exists
      const { data: checkData, error: checkError } = await supabase.functions.invoke('auth-check-email', {
        body: { email: email.toLowerCase().trim() }
      });

      if (checkError || !checkData?.exists) {
        throw new Error('No account found with that email address');
      }

      // Send verification code
      const { data, error: sendError } = await supabase.functions.invoke('auth-send-2fa', {
        body: { email: email.toLowerCase().trim() }
      });

      if (sendError || !data?.success) {
        throw new Error('Failed to send verification code. Please try again.');
      }

      setStep('code');
      setSuccess('A verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error: verifyError } = await supabase.functions.invoke('auth-verify-2fa', {
        body: { email: email.toLowerCase().trim(), code: code.trim() }
      });

      if (verifyError || !data?.success) {
        throw new Error(data?.error || 'Invalid verification code');
      }

      setStep('newPassword');
      setSuccess('Identity verified! Enter your new password.');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const { data, error: resetError } = await supabase.functions.invoke('auth-reset-password', {
        body: {
          email: email.toLowerCase().trim(),
          code: code.trim(),
          newPassword,
        }
      });

      if (resetError || !data?.success) {
        throw new Error(data?.error || 'Failed to reset password');
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center hero-gradient px-4 page-transition pt-16 sm:pt-20 pb-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blob" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blob" style={{ animationDelay: "5s" }} />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-6 sm:space-y-8 animate-fade-up">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-2">Reset Password</h1>
            <p className="text-sm sm:text-base text-primary-foreground/80">
              {step === 'email' && "Enter your email to receive a verification code"}
              {step === 'code' && "Enter the code sent to your email"}
              {step === 'newPassword' && "Set your new password"}
            </p>
          </div>

          <form
            onSubmit={
              step === 'email' ? handleSendCode :
              step === 'code' ? handleVerifyCode :
              handleResetPassword
            }
            className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl"
          >
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}

            {step === 'email' && (
              <div>
                <Label htmlFor="email" className="text-foreground text-sm sm:text-base">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="mt-1 h-11 sm:h-10 text-base sm:text-sm"
                />
              </div>
            )}

            {step === 'code' && (
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
            )}

            {step === 'newPassword' && (
              <>
                <div>
                  <Label htmlFor="newCode" className="text-foreground text-sm sm:text-base">New Verification Code</Label>
                  <Input
                    id="newCode"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter new 6-digit code"
                    required
                    maxLength={6}
                    className="mt-1 text-center text-xl sm:text-2xl tracking-widest h-12 sm:h-auto"
                  />
                  <p className="text-xs text-muted-foreground mt-1">A new code was sent to your email</p>
                </div>
                <div>
                  <Label htmlFor="newPassword" className="text-foreground text-sm sm:text-base">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className="mt-1 h-11 sm:h-10 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-foreground text-sm sm:text-base">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    minLength={8}
                    className="mt-1 h-11 sm:h-10 text-base sm:text-sm"
                  />
                </div>
              </>
            )}

            <LoadingButton
              type="submit"
              loading={loading}
              loadingText={
                step === 'email' ? 'Sending code...' :
                step === 'code' ? 'Verifying...' :
                'Resetting password...'
              }
              className="w-full h-12 sm:h-11 text-base sm:text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-300"
            >
              {step === 'email' ? 'Send Verification Code' :
               step === 'code' ? 'Verify Code' :
               'Reset Password'}
            </LoadingButton>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (step === 'email') {
                  navigate('/login');
                } else if (step === 'code') {
                  setStep('email');
                  setCode('');
                  setError('');
                  setSuccess('');
                } else {
                  setStep('code');
                  setCode('');
                  setError('');
                  setSuccess('');
                }
              }}
              className="w-full text-foreground/70 hover:text-foreground h-10"
            >
              ← {step === 'email' ? 'Back to login' : 'Go back'}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
