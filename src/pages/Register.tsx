import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck, UserPlus, Info, CheckCircle2, GraduationCap, Users } from "lucide-react";
import Navigation from "@/components/Navigation";
import SignupWaiverCheckboxes from "@/components/SignupWaiverCheckboxes";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameHint, setUsernameHint] = useState('');
  const [isStudentEmail, setIsStudentEmail] = useState(false);
  // userType removed - auto-assigned by backend based on email whitelist
  
  // Waiver checkboxes state
  const [insuranceAgreed, setInsuranceAgreed] = useState(false);
  const [safetyAgreed, setSafetyAgreed] = useState(false);
  const [liabilityAgreed, setLiabilityAgreed] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const isChadwickEmail = normalizedEmail.endsWith('@chadwickschool.org');
      setIsStudentEmail(isChadwickEmail);

      // Check if email is approved BEFORE sending verification code
      const { data: checkData, error: checkError } = await supabase.functions.invoke("auth-check-email", {
        body: { email: normalizedEmail },
      });

      if (checkError) {
        console.error('Email check error:', checkError);
        throw new Error('Failed to verify email eligibility');
      }

      if (!checkData?.approved) {
        toast({
          title: "Email not approved",
          description: "This email hasn't been approved yet. Please submit an access request first.",
          variant: "destructive",
        });
        navigate("/request-access");
        setLoading(false);
        return;
      }

      // Email is approved, now send verification code
      const { error: sendError } = await supabase.functions.invoke("auth-send-2fa", {
        body: { email: normalizedEmail },
      });

      if (sendError) throw sendError;

      toast({
        title: "Verification code sent",
        description: "Check your email for the verification code.",
      });

      setStep(2);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("auth-verify-2fa", {
        body: { email: email.toLowerCase().trim(), code: verificationCode },
      });

      if (error) throw error;
      if (!data.success) {
        toast({
          title: "Invalid code",
          description: data.error || "The verification code is incorrect.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Email verified",
        description: "Now complete your account details.",
      });

      setStep(3);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if username is available via edge function
  const checkUsernameAvailability = async () => {
    const clean = username.trim();
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameHint('');
      return;
    }
    setUsernameStatus('checking');
    setUsernameHint('Checking username availability...');
    console.log('Checking username:', clean);
    const { data, error } = await supabase.functions.invoke('auth-check-username', {
      body: { username: clean },
    });
    console.log('Username check response:', data, error);
    if (error) {
      setUsernameStatus('idle');
      setUsernameHint('');
      return;
    }
    if (data?.available) {
      setUsernameStatus('available');
      setUsernameHint('Username is available');
    } else {
      setUsernameStatus('taken');
      // Show the actual reason if provided, otherwise default message
      setUsernameHint(data?.reason || 'Username is already taken');
    }
  };

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate waivers are agreed (only for parent/staff accounts)
    if (!isStudentEmail && (!insuranceAgreed || !safetyAgreed || !liabilityAgreed)) {
      toast({
        title: "Agreement Required",
        description: "Please read and agree to all the required waivers before creating your account.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    // Validate password requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      toast({
        title: "Password requirements not met",
        description: "Password must be at least 8 characters with uppercase, lowercase, and number.",
        variant: "destructive",
      });
      return;
    }

    // Ensure username availability before creating account
    const cleanUsername = username.trim();
    const { data: nameData, error: nameError } = await supabase.functions.invoke('auth-check-username', {
      body: { username: cleanUsername },
    });
    if (nameError || !nameData?.available) {
      toast({
        title: "Username unavailable",
        description: "This username is already in use. Please choose a different username.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting to create account...');
      const { data, error } = await supabase.functions.invoke("auth-create-account", {
        body: {
          email: email.toLowerCase().trim(),
          username,
          password,
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        // Extract error message from edge function response
        let errorMessage = "An error occurred during registration";
        
        try {
          // Edge function errors come in the format: FunctionsHttpError
          // The actual error message is in error.context.error
          if (error.context && typeof error.context === 'object') {
            if (error.context.error) {
              errorMessage = error.context.error;
            } else if (typeof error.context === 'string') {
              try {
                const parsed = JSON.parse(error.context);
                errorMessage = parsed.error || errorMessage;
              } catch {
                errorMessage = error.context;
              }
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
        } catch (e) {
          console.error("Error parsing function error:", e);
        }
        
        console.error('Extracted error message:', errorMessage);
        
        // Check for specific error types and show user-friendly messages
        if (errorMessage.includes("Username already taken")) {
          toast({
            title: "Username unavailable",
            description: "This username is already in use. Please choose a different username.",
            variant: "destructive",
          });
        } else if (errorMessage.includes("Email already registered") || errorMessage.includes("Email already in use")) {
          toast({
            title: "Email already registered",
            description: "An account with this email already exists. Try logging in instead.",
            variant: "destructive",
          });
        } else if (errorMessage.includes("Failed to create auth account")) {
          toast({
            title: "Authentication Error",
            description: "Unable to create authentication account. Please try again or contact support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }

      if (data && !data.success) {
        console.error('Registration failed:', data);
        toast({
          title: "Registration failed",
          description: data.error || "Could not create account",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      console.log('Account created successfully');

      toast({
        title: "Account created!",
        description: isStudentEmail 
          ? "Please link your account to your parent for approval." 
          : "You can now log in with your credentials.",
      });

      if (isStudentEmail) {
        // For student accounts, redirect to linking page after a short delay
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        navigate("/login");
      }
    } catch (error: any) {
      // Handle unexpected errors (network issues, etc.)
      console.error('Unexpected error during registration:', error);
      console.error('Full exception:', JSON.stringify(error, null, 2));
      
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      try {
        if (error.context && typeof error.context === 'object') {
          if (error.context.error) {
            errorMessage = error.context.error;
          } else if (typeof error.context === 'string') {
            try {
              const parsed = JSON.parse(error.context);
              errorMessage = parsed.error || errorMessage;
            } catch {
              errorMessage = error.context;
            }
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch (e) {
        console.error("Error parsing exception:", e);
      }
      
      if (errorMessage.includes("Username already taken")) {
        toast({
          title: "Username unavailable",
          description: "This username is already in use. Please choose a different username.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("Email already registered") || errorMessage.includes("Email already in use")) {
        toast({
          title: "Email already registered", 
          description: "An account with this email already exists. Try logging in instead.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("Network") || errorMessage.includes("Failed to fetch")) {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("auth-send-2fa", {
        body: { email: email.toLowerCase().trim() },
      });

      if (error) throw error;

      toast({
        title: "Code resent",
        description: "A new verification code has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center hero-gradient p-4 page-transition pt-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blob" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blob" style={{ animationDelay: "5s" }} />
      </div>

      <Card className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl animate-fade-up">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-foreground">Create Account</CardTitle>
          <CardDescription className="text-center">
            {step === 1 && "Enter your email to get started"}
            {step === 2 && "Verify your email address"}
            {step === 3 && "Complete your account details"}
          </CardDescription>
          
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full transition-all duration-300 ${
                  s <= step ? "bg-gradient-to-r from-primary to-secondary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {/* Account Types Info Card */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Account Types:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        <span><strong>Students:</strong> Use your @chadwickschool.org email</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span><strong>Parents:</strong> Use any other email address</span>
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Your account type is automatically determined by your email domain.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-300" 
                disabled={loading}
              >
                {loading ? "Checking..." : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-center text-sm space-y-1">
                <div>
                  <span className="text-foreground/70">Already have an account? </span>
                  <Button
                    variant="ghost"
                    className="p-0 h-auto font-semibold text-primary hover:text-primary/80"
                    onClick={() => navigate("/login")}
                  >
                    Log in
                  </Button>
                </div>
                <div>
                  <span className="text-foreground/70">Don't have access? </span>
                  <Button
                    variant="ghost"
                    className="p-0 h-auto font-semibold text-primary hover:text-primary/80"
                    onClick={() => navigate("/request-access")}
                  >
                    Request Access
                  </Button>
                </div>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Success Message based on email type */}
              <div className={`p-4 rounded-lg border ${isStudentEmail ? 'bg-blue-500/10 border-blue-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isStudentEmail ? 'text-blue-600' : 'text-green-600'}`} />
                  <div>
                    {isStudentEmail ? (
                      <>
                        <p className="text-sm font-semibold text-foreground mb-2">
                          🎓 Student Email Detected!
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Check your Chadwick email for the verification code.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Next steps after verification:</strong>
                        </p>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <li>• Link to your parent's account</li>
                          <li>• View your family's carpool schedule</li>
                        </ul>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground mb-2">
                          👨‍👩‍👧 Parent Email Detected!
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Check your email for the verification code.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Next steps after verification:</strong>
                        </p>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <li>• Add your home address</li>
                          <li>• Find carpool partners near you</li>
                          <li>• Create or request rides</li>
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerificationSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="pl-10"
                      maxLength={6}
                      required
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We sent a verification code to <strong>{email}</strong>
                  </p>
                </div>

                <LoadingButton 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-300" 
                  loading={loading}
                  loadingText="Verifying..."
                >
                  Verify Email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </LoadingButton>

                <div className="flex items-center justify-between text-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-primary hover:text-primary/80"
                  >
                    Resend code
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleAccountCreation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameStatus('idle');
                    setUsernameHint('');
                  }}
                  onBlur={checkUsernameAvailability}
                  required
                  disabled={loading}
                />
                {usernameHint && (
                  <p className="text-xs text-muted-foreground">{usernameHint}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                />
              </div>

              {isStudentEmail && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    🎓 Student Account Detected
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll need parent approval to access the platform. After registration, you'll be able to send a link request to your parent.
                  </p>
                </div>
              )}

              {!isStudentEmail && (
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={userType === 'parent' ? 'default' : 'outline'}
                      onClick={() => setUserType('parent')}
                      disabled={loading}
                      className="w-full"
                    >
                      👨‍👩‍👧‍👦 Parent
                    </Button>
                    <Button
                      type="button"
                      variant={userType === 'staff' ? 'default' : 'outline'}
                      onClick={() => setUserType('staff')}
                      disabled={loading}
                      className="w-full"
                    >
                      👔 Staff
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Must be 8+ characters with uppercase, lowercase, and number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Waiver Checkboxes - Only for parent/staff accounts */}
              {!isStudentEmail && (
                <SignupWaiverCheckboxes
                  insuranceAgreed={insuranceAgreed}
                  safetyAgreed={safetyAgreed}
                  liabilityAgreed={liabilityAgreed}
                  onInsuranceChange={setInsuranceAgreed}
                  onSafetyChange={setSafetyAgreed}
                  onLiabilityChange={setLiabilityAgreed}
                  disabled={loading}
                />
              )}

              <LoadingButton 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-300" 
                loading={loading}
                loadingText="Creating Account..."
              >
                Create Account
                <UserPlus className="ml-2 h-4 w-4" />
              </LoadingButton>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(2)}
                disabled={loading}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default Register;
