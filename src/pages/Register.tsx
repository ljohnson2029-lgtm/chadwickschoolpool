import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck, UserPlus } from "lucide-react";

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
  const [userType, setUserType] = useState<'parent' | 'staff'>('parent');

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
      
      if (!isChadwickEmail) {
        const { data, error: dbError } = await supabase
          .from('approved_emails')
          .select('email')
          .ilike('email', normalizedEmail)
          .maybeSingle();

        if (dbError) throw dbError;
        
        if (!data) {
          toast({
            title: "Email not approved",
            description: "This email domain is not approved for registration.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

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
    const { data, error } = await supabase.functions.invoke('auth-check-username', {
      body: { username: clean },
    });
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
      setUsernameHint('Username is already taken');
    }
  };

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const { data, error } = await supabase.functions.invoke("auth-create-account", {
        body: {
          email: email.toLowerCase().trim(),
          username,
          password,
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
          userType: isStudentEmail ? 'student' : userType,
        },
      });

      if (error) {
        // Extract error message from edge function response
        // Edge functions return errors in the format: FunctionsHttpError with context.error
        let errorMessage = "An error occurred during registration";
        
        try {
          // Try to parse the error context if available
          if (error.context && typeof error.context === 'object' && error.context.error) {
            errorMessage = error.context.error;
          } else if (error.message) {
            errorMessage = error.message;
          }
        } catch (e) {
          console.error("Error parsing function error:", e);
        }
        
        // Check for specific error types
        if (errorMessage.includes("Username already taken")) {
          toast({
            title: "Username unavailable",
            description: "This username is already in use. Please choose a different username.",
            variant: "destructive",
          });
        } else if (errorMessage.includes("Email already registered")) {
          toast({
            title: "Email already registered",
            description: "An account with this email already exists. Try logging in instead.",
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
        toast({
          title: "Registration failed",
          description: data.error || "Could not create account",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

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
      // Handle unexpected errors
      let errorMessage = "An unexpected error occurred";
      
      try {
        if (error.context && typeof error.context === 'object' && error.context.error) {
          errorMessage = error.context.error;
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
      } else if (errorMessage.includes("Email already registered")) {
        toast({
          title: "Email already registered", 
          description: "An account with this email already exists. Try logging in instead.",
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
    <div className="min-h-screen flex items-center justify-center hero-gradient p-4 page-transition">
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
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@school.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Only approved school email domains can register
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 hover:shadow-xl transition-all duration-300" 
                disabled={loading}
              >
                {loading ? "Checking..." : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate("/login")}
                >
                  Log in
                </Button>
              </div>
            </form>
          )}

          {step === 2 && (
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
                  We sent a verification code to {email}
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 hover:shadow-xl transition-all duration-300" 
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Email"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

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
                  variant="link"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={loading}
                >
                  Resend code
                </Button>
              </div>
            </form>
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

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 hover:shadow-xl transition-all duration-300" 
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
                <UserPlus className="ml-2 h-4 w-4" />
              </Button>

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
  );
};

export default Register;
