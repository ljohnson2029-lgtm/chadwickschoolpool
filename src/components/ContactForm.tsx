import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Mail, CheckCircle2, AlertCircle, MessageSquare, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Validation Schema ---
const contactFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(100, "Subject must be less than 100 characters"),
  message: z
    .string()
    .min(10, "Message is too short (min 10 characters)")
    .max(2000, "Message is too long (max 2000 characters)"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export const ContactForm = () => {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Initialize Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      subject: "",
      message: "",
    },
  });

  // Handle Rate Limiting Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const onSubmit = async (data: ContactFormValues) => {
    if (cooldown > 0) return;

    try {
      // Invoke Supabase Function
      const { error } = await supabase.functions.invoke("send-email", {
        body: data,
      });

      if (error) throw new Error(error.message || "Failed to send");

      // Success Actions
      setIsSuccess(true);
      toast({
        title: "Message Sent Successfully",
        description: "We'll get back to you as soon as possible.",
        variant: "default",
        className:
          "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200",
      });

      reset();
      setCooldown(60); // 60s cooldown to prevent spam

      // Reset success state after animation
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Could not send email. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl border-t-4 border-t-primary animate-in fade-in zoom-in-95 duration-500">
      <CardHeader className="bg-muted/10 pb-6 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>Send us a message directly via email.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className={cn("flex items-center gap-2", errors.email && "text-destructive")}>
              <User className="w-3.5 h-3.5" /> Recipient Email
            </Label>
            <div className="relative group">
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                disabled={isSubmitting || cooldown > 0}
                className={cn(
                  "pl-9 transition-all duration-200",
                  errors.email
                    ? "border-destructive focus-visible:ring-destructive/30"
                    : "group-hover:border-primary/50",
                )}
                {...register("email")}
              />
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />

              {/* Validation Status Icon */}
              <div className="absolute right-3 top-2.5">
                {errors.email ? (
                  <AlertCircle className="w-4 h-4 text-destructive animate-in zoom-in" />
                ) : dirtyFields.email && !errors.email ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in zoom-in" />
                ) : null}
              </div>
            </div>
            {errors.email && (
              <p className="text-xs text-destructive font-medium animate-in slide-in-from-left-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject" className={cn(errors.subject && "text-destructive")}>
              Subject
            </Label>
            <Input
              id="subject"
              type="text"
              placeholder="What is this regarding?"
              disabled={isSubmitting || cooldown > 0}
              className={cn(errors.subject && "border-destructive focus-visible:ring-destructive/30")}
              {...register("subject")}
            />
            {errors.subject && (
              <p className="text-xs text-destructive font-medium animate-in slide-in-from-left-1">
                {errors.subject.message}
              </p>
            )}
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="message" className={cn("flex items-center gap-2", errors.message && "text-destructive")}>
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </Label>
              <span
                className={cn(
                  "text-[10px]",
                  dirtyFields.message ? "text-primary font-medium" : "text-muted-foreground",
                )}
              >
                {dirtyFields.message ? "Typing..." : "Max 2000 chars"}
              </span>
            </div>
            <Textarea
              id="message"
              placeholder="Please describe your issue in detail..."
              disabled={isSubmitting || cooldown > 0}
              rows={5}
              className={cn(
                "resize-none transition-all duration-200",
                errors.message
                  ? "border-destructive focus-visible:ring-destructive/30"
                  : "focus-visible:ring-primary/30",
              )}
              {...register("message")}
            />
            {errors.message && (
              <p className="text-xs text-destructive font-medium animate-in slide-in-from-left-1">
                {errors.message.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className={cn(
              "w-full h-11 text-base font-medium transition-all duration-300 shadow-sm",
              isSuccess ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200" : "hover:shadow-md",
            )}
            disabled={isSubmitting || cooldown > 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Email...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2 animate-bounce" />
                Sent Successfully!
              </>
            ) : cooldown > 0 ? (
              <>Wait {cooldown}s to send again</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center border-t bg-muted/30 py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground opacity-80">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Securely processed via Resend</span>
        </div>
      </CardFooter>
    </Card>
  );
};
