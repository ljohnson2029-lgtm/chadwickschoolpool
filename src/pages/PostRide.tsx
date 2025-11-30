import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Hand, Car } from "lucide-react";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";

const PostRide = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

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
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PostRide;
