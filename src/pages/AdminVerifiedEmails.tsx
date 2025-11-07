import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mail, Calendar, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface VerifiedEmail {
  id: string;
  email: string;
  verified_at: string;
  created_at: string;
}

const AdminVerifiedEmails = () => {
  const [emails, setEmails] = useState<VerifiedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const fetchVerifiedEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("verified_emails")
        .select("*")
        .order("verified_at", { ascending: false });

      if (error) throw error;

      setEmails(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch verified emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to access this page.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (user) {
      fetchVerifiedEmails();
    }
  }, [user, authLoading, navigate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen via useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-4xl font-bold">Verified Emails</h1>
            </div>
            <p className="text-muted-foreground ml-14">
              View all successfully verified email addresses
            </p>
          </div>
          <Button
            onClick={fetchVerifiedEmails}
            disabled={loading}
            variant="outline"
            size="icon"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading verified emails...</p>
          </div>
        ) : emails.length === 0 ? (
          <Card className="p-12 text-center">
            <Mail className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No verified emails yet</h2>
            <p className="text-muted-foreground mb-6">
              Verified emails will appear here once users complete the verification process
            </p>
            <Button onClick={() => navigate("/verify-email")}>
              Go to Email Verification
            </Button>
          </Card>
        ) : (
          <>
            <div className="bg-card border rounded-lg p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Total Verified: <span className="text-foreground text-lg font-bold">{emails.length}</span>
              </p>
            </div>

            <div className="grid gap-4">
              {emails.map((item) => (
                <Card key={item.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-primary/10 p-3 rounded-full">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h3 className="text-lg font-semibold break-all">
                          {item.email}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Verified: {formatDate(item.verified_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>ID: {item.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminVerifiedEmails;
