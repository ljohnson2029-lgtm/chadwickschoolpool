import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Mail } from "lucide-react";

const EmailVerification = () => {
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifiedEmails, setVerifiedEmails] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auth-send-2fa", {
        body: { email },
      });

      if (error) throw error;

      if (data?.success) {
        setStep("code");
        setResendCooldown(60);
        toast({
          title: "Code sent!",
          description: "Check your email for the verification code",
        });
      } else {
        throw new Error(data?.error || "Failed to send code");
      }
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

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auth-verify-2fa", {
        body: { email, code },
      });

      if (error) throw error;

      if (data?.success) {
        // Save to database
        const { error: dbError } = await supabase
          .from("verified_emails")
          .insert({ email });

        if (dbError && !dbError.message.includes("duplicate")) {
          console.error("Failed to save verified email:", dbError);
        }

        setVerifiedEmails([...verifiedEmails, email]);
        setStep("success");
        toast({
          title: "Success!",
          description: "Email verified successfully",
        });
      } else {
        throw new Error(data?.error || "Invalid or expired code");
      }
    } catch (error: any) {
      toast({
        title: "Wrong code",
        description: "Please try again or request a new code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setResendCooldown(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Email Verification</h1>
          <p className="text-muted-foreground">
            {step === "email" && "Enter your email to receive a verification code"}
            {step === "code" && "Enter the 6-digit code sent to your email"}
            {step === "success" && "Your email has been verified!"}
          </p>
        </div>

        <div className="bg-card border rounded-lg p-8 shadow-lg space-y-6">
          {step === "email" && (
            <>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendCode()}
                  disabled={loading}
                />
              </div>
              <Button
                onClick={sendCode}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Sending..." : "Send Code"}
              </Button>
            </>
          )}

          {step === "code" && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-center text-muted-foreground gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Code sent to {email}</span>
                </div>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                    onComplete={verifyCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Expires in 10 minutes
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={verifyCode}
                  disabled={loading || code.length !== 6}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>
                <Button
                  onClick={sendCode}
                  disabled={loading || resendCooldown > 0}
                  variant="outline"
                  className="w-full"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Code"}
                </Button>
              </div>
            </>
          )}

          {step === "success" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Verified!</h2>
                <p className="text-muted-foreground">
                  Your email has been successfully verified
                </p>
              </div>
              <div className="space-y-3">
                <Button onClick={resetFlow} className="w-full" size="lg">
                  Verify Another Email
                </Button>
                <Button 
                  onClick={() => window.location.href = "/admin/verified-emails"} 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                >
                  View All Verified Emails
                </Button>
              </div>
            </div>
          )}
        </div>

        {verifiedEmails.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Verified Emails:</p>
            <ul className="space-y-1">
              {verifiedEmails.map((verifiedEmail, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {verifiedEmail}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;
