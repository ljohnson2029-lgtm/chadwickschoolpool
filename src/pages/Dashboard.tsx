import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Link as LinkIcon } from "lucide-react";
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
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const isStudent = userRole === 'student';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 pt-24">
        {isStudent ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Family's Carpools</h1>
              <p className="text-muted-foreground">
                View carpools created by your linked parents
              </p>
            </div>
            
            <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Student View</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    You can view carpools created by your linked parents. To create or edit carpools, ask your parent to do so on your behalf.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/family-links')}
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Link to Parent
                  </Button>
                </div>
              </div>
            </Card>

            <RidesList key={refreshKey} />
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold mb-8">Carpool Dashboard</h1>

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
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
