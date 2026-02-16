import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

// --- Schema Definition ---
const contactFormSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(100, "Subject must be less than 100 characters"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters") // Prevent "hi" spam
    .max(2000, "Message is too long"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export const ContactForm = () => {
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
    defaultValues: {
      email: "",
      subject: "",
      message: "",
    },
  });

  // Handle Cooldown Timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const onSubmit = async (data: ContactFormValues) => {
    if (cooldown > 0) return;

    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: data,
      });

      if (error) throw error;

      // Success Actions
      setIsSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#10b981", "#ffffff"],
      });

      toast({
        title: "Message Sent!",
        description: "We've received your message and will get back to you shortly.",
        variant: "default",
        className:
          "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200",
      });

      reset();
      setCooldown(60); // 60 second cooldown

      // Reset success state after animation
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Failed to send",
        description: error.message || "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-t-4 border-t-primary shadow-lg transition-all hover:shadow-xl">
      <CardHeader className="bg-muted/30 pb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Get in Touch</CardTitle>
            <CardDescription>Send us a message via Resend</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="-mt-4 space-y-4 bg-card pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className={cn(errors.email && "text-destructive")}>
              Recipient Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                placeholder="name@example.com"
                className={cn(
                  "pl-9 transition-colors",
                  errors.email && "border-destructive focus-visible:ring-destructive/30",
                )}
                disabled={isSubmitting || cooldown > 0}
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            {errors.email && (
              <p className="flex items-center gap-1 text-xs text-destructive animate-in slide-in-from-left-1">
                <AlertCircle className="h-3 w-3" />
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
              placeholder="What is this regarding?"
              className={cn(errors.subject && "border-destructive focus-visible:ring-destructive/30")}
              disabled={isSubmitting || cooldown > 0}
              {...register("subject")}
              aria-invalid={!!errors.subject}
            />
            {errors.subject && (
              <p className="flex items-center gap-1 text-xs text-destructive animate-in slide-in-from-left-1">
                <AlertCircle className="h-3 w-3" />
                {errors.subject.message}
              </p>
            )}
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className={cn(errors.message && "text-destructive")}>
                Message
              </Label>
              {dirtyFields.message && !errors.message && (
                <span className="text-[10px] text-muted-foreground animate-in fade-in">Looking good!</span>
              )}
            </div>
            <Textarea
              id="message"
              placeholder="Tell us more about your inquiry..."
              className={cn(
                "min-h-[120px] resize-y",
                errors.message && "border-destructive focus-visible:ring-destructive/30",
              )}
              disabled={isSubmitting || cooldown > 0}
              {...register("message")}
              aria-invalid={!!errors.message}
            />
            {errors.message && (
              <p className="flex items-center gap-1 text-xs text-destructive animate-in slide-in-from-left-1">
                <AlertCircle className="h-3 w-3" />
                {errors.message.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className={cn("w-full transition-all duration-300", isSuccess ? "bg-emerald-600 hover:bg-emerald-700" : "")}
            disabled={isSubmitting || cooldown > 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Sent Successfully
              </>
            ) : cooldown > 0 ? (
              `Wait ${cooldown}s`
            ) : (
              <>
                Send Email
                <Send className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>

      {/* Footer / Privacy Note */}
      <CardFooter className="justify-center border-t bg-muted/20 py-3">
        <p className="text-xs text-muted-foreground text-center">
          Protected by strict privacy standards. We never share your data.
        </p>
      </CardFooter>
    </Card>
  );
};
