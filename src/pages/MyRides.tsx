import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { Car, History } from "lucide-react";
import { toast } from "sonner";
import { DeleteRideDialog } from "@/components/ConfirmDialogs";
import { UnifiedRideCard, type UnifiedRide } from "@/components/UnifiedRideCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchUnifiedRides } from "@/lib/fetchUnifiedRides";

const MyRides = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activeRides, setActiveRides] = useState<UnifiedRide[]>([]);
  const [pastRides, setPastRides] = useState<UnifiedRide[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rideToDelete, setRideToDelete] = useState<UnifiedRide | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadRides();
    }
  }, [user]);

  const loadRides = async () => {
    if (!user) return;
    setLoadingData(true);
    const { active, past } = await fetchUnifiedRides(user.id);
    setActiveRides(active);
    setPastRides(past);
    setLoadingData(false);
  };

  const handleCancelRide = async (ride: UnifiedRide) => {
    setRideToDelete(ride);
    setDeleteDialogOpen(true);
  };

  const confirmCancelRide = async () => {
    if (!rideToDelete || !user) return;

    setDeleteLoading(true);

    try {
      if (rideToDelete.source === 'posted') {
        const { error } = await supabase
          .from('rides')
          .update({ status: 'cancelled' })
          .eq('id', rideToDelete.id)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success('Ride cancelled');
      } else if (rideToDelete.source === 'conversation') {
        const { error } = await supabase
          .from('ride_conversations')
          .delete()
          .eq('id', rideToDelete.id)
          .eq('sender_id', user.id);
        if (error) throw error;
        toast.success('Left the ride');
      } else if (rideToDelete.source === 'private') {
        const { error } = await supabase
          .from('private_ride_requests')
          .delete()
          .eq('id', rideToDelete.id);
        if (error) throw error;
        toast.success('Ride cancelled');
      }

      loadRides();
    } catch (error: any) {
      toast.error('Failed to cancel: ' + error.message);
    }

    setDeleteLoading(false);
    setDeleteDialogOpen(false);
    setRideToDelete(null);
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
        <Breadcrumbs items={[{ label: "My Rides" }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Rides</h1>
          <p className="text-muted-foreground">All your rides in one place</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="gap-1.5">
              <Car className="h-4 w-4" />
              Active ({activeRides.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-1.5">
              <History className="h-4 w-4" />
              Past ({pastRides.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loadingData ? (
              <div className="text-center py-12">Loading...</div>
            ) : activeRides.length === 0 ? (
              <EmptyState
                icon={Car}
                title="No Active Rides"
                description="Post a ride or join someone else's to get started"
                action={{
                  label: "Find Rides",
                  onClick: () => navigate('/find-rides')
                }}
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-4 pr-4">
                  {activeRides.map((ride) => (
                    <UnifiedRideCard
                      key={`${ride.source}-${ride.id}`}
                      ride={ride}
                      onCancel={() => handleCancelRide(ride)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="past">
            {loadingData ? (
              <div className="text-center py-12">Loading...</div>
            ) : pastRides.length === 0 ? (
              <EmptyState
                icon={History}
                title="No Past Rides"
                description="Completed and cancelled rides will appear here"
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-4 pr-4">
                  {pastRides.map((ride) => (
                    <UnifiedRideCard
                      key={`${ride.source}-${ride.id}`}
                      ride={ride}
                      isPast
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DeleteRideDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmCancelRide}
          loading={deleteLoading}
        />
      </div>
    </DashboardLayout>
  );
};

export default MyRides;
