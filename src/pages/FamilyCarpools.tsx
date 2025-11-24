import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TabNavigation from "@/components/TabNavigation";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";
import RidesList from "@/components/RidesList";

const FamilyCarpools = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setUserRole(data?.role || null);
      setRoleLoading(false);
    };

    fetchUserRole();
  }, [user]);

  const handleRideCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (loading || roleLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <TabNavigation />
        <div className="flex items-center justify-center min-h-[60vh] pt-20">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const isChild = userRole === "student";

  return (
    <div className="min-h-screen bg-background">
      <TabNavigation />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Family Carpools</h1>
            <p className="text-muted-foreground">
              {isChild
                ? "View carpools created by your linked parents"
                : "Manage ride requests and offers for your family"}
            </p>
          </div>

          {isChild && (
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <span className="font-medium">Child Account - View Only</span>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You can view all carpool information, but your parent needs to
                  manage rides for you.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {!isChild ? (
            <Tabs defaultValue="browse" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="browse">Browse Available Rides</TabsTrigger>
                <TabsTrigger value="request">Request a Ride</TabsTrigger>
                <TabsTrigger value="offer">Offer a Ride</TabsTrigger>
              </TabsList>

              <TabsContent value="browse">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Available Rides</h2>
                  <RidesList key={refreshKey} />
                </div>
              </TabsContent>

              <TabsContent value="request">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Request a Ride</h2>
                  <RideRequestForm onSuccess={handleRideCreated} />
                </Card>
              </TabsContent>

              <TabsContent value="offer">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Offer a Ride</h2>
                  <RideOfferForm onSuccess={handleRideCreated} />
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">My Family's Rides</h2>
                <Button
                  variant="outline"
                  onClick={() => navigate("/student-linking")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Link to Parent
                </Button>
              </div>
              <RidesList key={refreshKey} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FamilyCarpools;
