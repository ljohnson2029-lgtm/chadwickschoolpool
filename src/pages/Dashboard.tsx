import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";
import RidesList from "@/components/RidesList";

const Dashboard = () => {
  const { user, loading } = useAuth();
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
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserRole(data?.role || null);
      setRoleLoading(false);
    };

    fetchUserRole();
  }, [user]);

  const handleRideCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading || roleLoading || !user) {
    return <div>Loading...</div>;
  }

  const isStudent = userRole === 'student';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Carpool Dashboard</h1>

        {isStudent ? (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Students cannot create ride requests or offers. Please have your parent manage rides on your behalf.
            </p>
            <RidesList key={refreshKey} />
          </div>
        ) : (
          <Tabs defaultValue="browse" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="browse">Browse Rides</TabsTrigger>
              <TabsTrigger value="request">Request a Ride</TabsTrigger>
              <TabsTrigger value="offer">Offer a Ride</TabsTrigger>
            </TabsList>

            <TabsContent value="browse">
              <RidesList key={refreshKey} />
            </TabsContent>

            <TabsContent value="request">
              <RideRequestForm onSuccess={handleRideCreated} />
            </TabsContent>

            <TabsContent value="offer">
              <RideOfferForm onSuccess={handleRideCreated} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
