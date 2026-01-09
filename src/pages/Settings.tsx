import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TestDataGenerator from "@/components/TestDataGenerator";
import PrivacySettings from "@/components/PrivacySettings";
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
          {/* Privacy Settings */}
          <PrivacySettings />

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">More settings coming soon...</p>
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
