import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Hand, Car, School } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";

// Chadwick School address (matching FindRidesMap)
const CHADWICK_SCHOOL_ADDRESS = '26800 S Academy Dr, Palos Verdes Peninsula, CA 90274';

const PostRide = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for quick action params
  const destination = searchParams.get('destination');
  const origin = searchParams.get('origin');
  
  // Pre-fill based on query params
  const prefillPickup = origin === 'chadwick' ? CHADWICK_SCHOOL_ADDRESS : undefined;
  const prefillDropoff = destination === 'chadwick' ? CHADWICK_SCHOOL_ADDRESS : undefined;
  const showSchoolInfo = destination === 'chadwick' || origin === 'chadwick';

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const handleSuccess = () => {
    navigate('/find-rides');
  };

  if (loading || !user || !profile) {
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
      <div className="container mx-auto px-4 max-w-4xl">
        <Breadcrumbs items={[{ label: "Post a Ride" }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Post a Ride</h1>
          <p className="text-muted-foreground">
            Create a public post that all parents can see and respond to
          </p>
        </div>

        {showSchoolInfo && (
          <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <School className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              {destination === 'chadwick' 
                ? 'Creating a ride to Chadwick School - destination has been pre-filled for you.'
                : 'Creating a ride from Chadwick School - starting location has been pre-filled for you.'}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="request" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request" className="gap-2">
              <Hand className="h-4 w-4" />
              Request a Ride
            </TabsTrigger>
            <TabsTrigger value="offer" className="gap-2">
              <Car className="h-4 w-4" />
              Offer a Ride
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request">
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">I need a ride</h2>
                <p className="text-muted-foreground">
                  Post a ride request that all parents can see. They can respond with "I Can Help!"
                </p>
              </div>
              <RideRequestForm 
                onSuccess={handleSuccess}
                isBroadcast={true}
                prefillPickup={prefillPickup}
                prefillDropoff={prefillDropoff}
              />
            </Card>
          </TabsContent>

          <TabsContent value="offer">
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">I can offer a ride</h2>
                <p className="text-muted-foreground">
                  Post a ride offer that all parents can see. They can respond with "I Need This!"
                </p>
              </div>
              <RideOfferForm 
                onSuccess={handleSuccess}
                isBroadcast={true}
                prefillPickup={prefillPickup}
                prefillDropoff={prefillDropoff}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PostRide;
