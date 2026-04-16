import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingButton } from '@/components/ui/loading-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import CreatorFooter from '@/components/CreatorFooter';
import { KeyRound, ArrowLeft, CheckCircle2, Mail, Lock, Sparkles } from 'lucide-react';

type Step = 'email' | 'code' | 'newPassword';

const ForgotPassword = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifiedCode, setVerifiedCode] = useState('');
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
    } catch (err) {
      setError((err as Error).message || 'Something went wrong');
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

      setVerifiedCode(code.trim());
      setStep('newPassword');
      setSuccess('Identity verified! Enter your new password.');
    } catch (err) {
      setError((err as Error).message || 'Invalid verification code');
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
          code: verifiedCode,
          newPassword,
        }
      });

      if (resetError || !data?.success) {
        throw new Error(data?.error || 'Failed to reset password');
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError((err as Error).message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center hero-gradient px-4 pt-16 sm:pt-20 pb-8 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div 
          className="relative z-10 w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
            >
              <KeyRound className="w-8 h-8 text-white" />
            </motion.div>
            <motion.h1 
              className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Reset Password
            </motion.h1>
            <motion.p 
              className="text-sm sm:text-base text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {step === 'email' && "Enter your email to receive a verification code"}
              {step === 'code' && "Enter the code sent to your email"}
              {step === 'newPassword' && "Set your new password"}
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={
                step === 'email' ? handleSendCode :
                step === 'code' ? handleVerifyCode :
                handleResetPassword
              }
              className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl p-6 sm:p-8 space-y-5 sm:space-y-6 shadow-xl"
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert className="rounded-xl bg-emerald-50 border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-700">{success}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {step === 'email' && (
                <div>
                  <Label htmlFor="email" className="text-foreground text-sm sm:text-base flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="mt-2 h-11 text-base rounded-xl"
                  />
                </div>
              )}

              {step === 'code' && (
                <div>
                  <Label htmlFor="code" className="text-foreground text-sm sm:text-base">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    required
                    maxLength={6}
                    className="mt-2 text-center text-2xl h-14 rounded-xl font-mono tracking-widest"
                  />
                </div>
              )}

              {step === 'newPassword' && (
                <>
                  <div>
                    <Label htmlFor="newPassword" className="text-foreground text-sm sm:text-base flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gray-500" />
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="mt-2 h-11 rounded-xl"
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
                      className="mt-2 h-11 rounded-xl"
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
                className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 rounded-xl"
              >
                {step === 'email' ? 'Send Verification Code' :
                 step === 'code' ? 'Verify Code' :
                 'Reset Password'}
              </LoadingButton>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {step === 'email' ? 'Back to login' : 'Go back'}
                </Button>
              </motion.div>
            </motion.form>
          </AnimatePresence>
        </motion.div>
      </div>
      <CreatorFooter />
    </>
  );
};

export default ForgotPassword;
