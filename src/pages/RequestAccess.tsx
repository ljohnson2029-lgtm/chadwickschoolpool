import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const requestSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(254),
  full_name: z.string().trim().min(1, "Full name is required").max(100),
  requester_type: z.enum(["parent", "student"], { required_error: "Please select your role" }),
  reason: z.string().trim().max(500).optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

const RequestAccess = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      email: "",
      full_name: "",
      reason: "",
    },
  });

  const onSubmit = async (values: RequestFormValues) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("submit-access-request", {
        body: values,
      });

      if (error) throw error;

      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Request Submitted!</CardTitle>
              <CardDescription className="text-base mt-2">
                You'll receive an email when approved (usually within 24 hours).
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 flex items-center justify-center p-4 py-12">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Request Access to SchoolPool</CardTitle>
            <CardDescription>
              Submit your information below and an administrator will review your request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requester_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>I am a: *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="parent" id="parent" />
                            <Label htmlFor="parent">Chadwick Parent</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="student" id="student" />
                            <Label htmlFor="student">Chadwick Student</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why do you need access? (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us briefly why you'd like to join SchoolPool..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={submitting}>
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default RequestAccess;
