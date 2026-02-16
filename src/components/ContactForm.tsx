import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const contactFormSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  subject: z.string().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().min(1, "Message is required").max(2000, "Message must be less than 2000 characters"),
});

export const ContactForm = () => {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate input
      const validatedData = contactFormSchema.parse({
        email,
        subject,
        message,
      });

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: validatedData,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your email has been sent successfully.",
      });

      // Reset form
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error sending email:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to send email. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Send Email</CardTitle>
        <CardDescription>Send an email using Resend</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Recipient Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Email"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
