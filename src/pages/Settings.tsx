import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import TestDataGenerator from "@/components/TestDataGenerator";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import VerifiedBadge from "@/components/VerifiedBadge";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-4xl">
        <Breadcrumbs items={[{ label: "Settings" }]} />
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Settings</h1>
          <VerifiedBadge />
        </div>

        <div className="space-y-6">
          {/* Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Feedback
              </CardTitle>
              <CardDescription>
                Help us improve Chadwick SchoolPool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Found a bug or have a suggestion? We'd love to hear from you!
              </p>
              <Button asChild>
                <Link to="/feedback">Send Feedback</Link>
              </Button>
            </CardContent>
          </Card>

          {isDevelopment && (
            <Card className="border-yellow-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <span>⚠️</span> Development Tools
                </CardTitle>
                <CardDescription>
                  These tools are only available in development mode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestDataGenerator />
              </CardContent>
            </Card>
          )}

          {/* Delete Account */}
          <DeleteAccountSection />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
