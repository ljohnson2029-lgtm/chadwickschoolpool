import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TestDataGenerator from "@/components/TestDataGenerator";

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
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        {isDevelopment && (
          <Card className="mb-6 border-yellow-500/20">
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
      </div>
    </div>
  );
};

export default Settings;
