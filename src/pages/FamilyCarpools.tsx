import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle, Map as MapIcon, List, Hand, Car } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";
import RidesList from "@/components/RidesList";
import FindRidesMap from "@/components/FindRidesMap";
import { isParent as checkIsParent, isStudent as checkIsStudent, getStudentPermissionError } from "@/lib/permissions";

const FamilyCarpools = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showRequests, setShowRequests] = useState(true);
  const [showOffers, setShowOffers] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isUserParent, setIsUserParent] = useState(false);
  const [isUserStudent, setIsUserStudent] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setUserRole(roleData?.role || null);
      setRoleLoading(false);

      // Fetch email to determine parent/student
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', user.id)
        .single();
      
      if (userData?.email) {
        setUserEmail(userData.email);
        setIsUserParent(checkIsParent(userData.email));
        setIsUserStudent(checkIsStudent(userData.email));
      }
    };

    fetchUserInfo();
  }, [user]);

  const handleRideCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (loading || roleLoading || !user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-7xl">
        <Breadcrumbs items={[{ label: "Family Carpools" }]} />
        
        <div className="space-y-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Family Carpools</h1>
                <Badge 
                  variant={isUserStudent ? 'secondary' : 'default'}
                  className={isUserStudent 
                    ? 'bg-blue-500/10 text-blue-600' 
                    : 'bg-green-500/10 text-green-600'
                  }
                >
                  {isUserStudent ? 'Student Account' : 'Parent Account'}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Browse, request, and offer rides to families
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <MapIcon className="h-4 w-4 mr-2" />
                Map View
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4 mr-2" />
                List View
              </Button>
            </div>
          </div>

          {isUserStudent && (
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <span className="font-medium">Student Account - View Only</span>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You can browse all rides, but ask your parent to manage ride requests and offers.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {viewMode === 'map' && (
            <FindRidesMap 
              height="500px"
              showRequests={showRequests}
              showOffers={showOffers}
              onToggleRequests={setShowRequests}
              onToggleOffers={setShowOffers}
            />
          )}

          {viewMode === 'list' && (
            <Tabs defaultValue="browse" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="browse">Browse Available Rides</TabsTrigger>
                <TabsTrigger value="request" disabled={isUserStudent}>
                  Request a Ride
                  {isUserStudent && <span className="text-xs ml-1">(Parents)</span>}
                </TabsTrigger>
                <TabsTrigger value="offer" disabled={isUserStudent}>
                  Offer a Ride
                  {isUserStudent && <span className="text-xs ml-1">(Parents)</span>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="browse">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Available Rides</h2>
                    {isUserStudent && (
                      <Button
                        variant="outline"
                        onClick={() => navigate("/family-links")}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Link to Parent
                      </Button>
                    )}
                  </div>
                  <RidesList key={refreshKey} />
                </div>
              </TabsContent>

              <TabsContent value="request">
                {isUserStudent ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {getStudentPermissionError("request rides")}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Request a Ride</h2>
                    <RideRequestForm onSuccess={handleRideCreated} />
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="offer">
                {isUserStudent ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {getStudentPermissionError("offer rides")}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Offer a Ride</h2>
                    <RideOfferForm onSuccess={handleRideCreated} />
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FamilyCarpools;
