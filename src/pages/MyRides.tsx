import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { Car } from "lucide-react";
import { toast } from "sonner";
import { DeleteRideDialog } from "@/components/ConfirmDialogs";
import { UnifiedRideCard, type UnifiedRide } from "@/components/UnifiedRideCard";
import { ScrollArea } from "@/components/ui/scroll-area";

const MyRides = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [unifiedRides, setUnifiedRides] = useState<UnifiedRide[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rideToDelete, setRideToDelete] = useState<UnifiedRide | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAllRides();
    }
  }, [user]);

  const fetchAllRides = async () => {
    if (!user) return;
    setLoadingData(true);

    const allRides: UnifiedRide[] = [];

    // 1. Fetch user's own broadcast rides (Posted)
    const { data: myRides } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('ride_date', new Date().toISOString().split('T')[0]);

    if (myRides) {
      for (const ride of myRides) {
        allRides.push({
          id: ride.id,
          source: 'posted',
          rideType: ride.type as 'request' | 'offer',
          status: ride.type === 'request' ? 'posted-looking' : 'posted-offering',
          pickupLocation: ride.pickup_location,
          dropoffLocation: ride.dropoff_location,
          rideDate: ride.ride_date,
          rideTime: ride.ride_time,
          seatsAvailable: ride.seats_available,
          seatsNeeded: ride.seats_needed,
          isDriver: ride.type === 'offer',
          otherParent: null,
          originalData: ride,
        });
      }
    }

    // 2. Fetch ride conversations where user joined someone else's ride
    const { data: joinedConversations } = await supabase
      .from('ride_conversations')
      .select('*, rides(*)')
      .eq('sender_id', user.id)
      .eq('status', 'accepted');

    if (joinedConversations) {
      const rideOwnerIds = [...new Set(joinedConversations.map(c => c.rides?.user_id).filter(Boolean))];
      let ownerProfiles: Record<string, any> = {};
      
      if (rideOwnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, phone_number, share_phone, share_email')
          .in('id', rideOwnerIds);
        
        const { data: users } = await supabase
          .from('users')
          .select('user_id, email')
          .in('user_id', rideOwnerIds);

        if (profiles) {
          ownerProfiles = profiles.reduce((acc, p) => {
            const userEmail = users?.find(u => u.user_id === p.id)?.email;
            acc[p.id] = { ...p, email: userEmail };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      for (const conv of joinedConversations) {
        if (!conv.rides) continue;
        const ride = conv.rides;
        const owner = ownerProfiles[ride.user_id];
        
        // Determine if user is joining a ride offer or helping with a request
        const isHelpingWithRequest = ride.type === 'request';
        
        allRides.push({
          id: conv.id,
          source: 'conversation',
          rideType: ride.type as 'request' | 'offer',
          status: isHelpingWithRequest ? 'helping-out' : 'joined-ride',
          pickupLocation: ride.pickup_location,
          dropoffLocation: ride.dropoff_location,
          rideDate: ride.ride_date,
          rideTime: ride.ride_time,
          seatsAvailable: ride.seats_available,
          seatsNeeded: ride.seats_needed,
          isDriver: isHelpingWithRequest,
          otherParent: owner ? {
            id: owner.id,
            firstName: owner.first_name,
            lastName: owner.last_name,
            username: owner.username,
            email: owner.share_email ? owner.email : null,
            phone: owner.share_phone ? owner.phone_number : null,
          } : null,
          originalData: { conversation: conv, ride },
        });
      }
    }

    // 3. Fetch private ride requests (both sent and received, accepted only)
    const { data: privateRequests } = await supabase
      .from('private_ride_requests')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq('status', 'accepted')
      .gte('ride_date', new Date().toISOString().split('T')[0]);

    if (privateRequests) {
      const otherUserIds = [...new Set(privateRequests.map(r => 
        r.sender_id === user.id ? r.recipient_id : r.sender_id
      ))];
      
      let otherProfiles: Record<string, any> = {};
      
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, phone_number, share_phone, share_email')
          .in('id', otherUserIds);
        
        const { data: users } = await supabase
          .from('users')
          .select('user_id, email')
          .in('user_id', otherUserIds);

        if (profiles) {
          otherProfiles = profiles.reduce((acc, p) => {
            const userEmail = users?.find(u => u.user_id === p.id)?.email;
            acc[p.id] = { ...p, email: userEmail };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      for (const req of privateRequests) {
        const isSender = req.sender_id === user.id;
        const otherId = isSender ? req.recipient_id : req.sender_id;
        const other = otherProfiles[otherId];
        
        // Determine user's role based on who sent and what type
        let status: UnifiedRide['status'];
        let isDriver: boolean;
        
        if (isSender) {
          // User sent the request
          if (req.request_type === 'request') {
            status = 'joined-ride'; // User requested a ride, other is driving
            isDriver = false;
          } else {
            status = 'helping-out'; // User offered to drive
            isDriver = true;
          }
        } else {
          // User received the request
          if (req.request_type === 'request') {
            status = 'helping-out'; // Other requested, user is driving
            isDriver = true;
          } else {
            status = 'joined-ride'; // Other offered, user is passenger
            isDriver = false;
          }
        }

        allRides.push({
          id: req.id,
          source: 'private',
          rideType: req.request_type,
          status,
          pickupLocation: req.pickup_address,
          dropoffLocation: req.dropoff_address,
          rideDate: req.ride_date,
          rideTime: req.pickup_time,
          seatsAvailable: req.seats_offered,
          seatsNeeded: req.seats_needed,
          isDriver,
          otherParent: other ? {
            id: other.id,
            firstName: other.first_name,
            lastName: other.last_name,
            username: other.username,
            email: other.share_email ? other.email : null,
            phone: other.share_phone ? other.phone_number : null,
          } : null,
          originalData: req,
        });
      }
    }

    // Sort by date (soonest first)
    allRides.sort((a, b) => {
      const dateA = new Date(`${a.rideDate}T${a.rideTime}`);
      const dateB = new Date(`${b.rideDate}T${b.rideTime}`);
      return dateA.getTime() - dateB.getTime();
    });

    setUnifiedRides(allRides);
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
        // Delete the broadcast ride
        const { error } = await supabase
          .from('rides')
          .delete()
          .eq('id', rideToDelete.id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Ride post deleted');
      } else if (rideToDelete.source === 'conversation') {
        // Delete the conversation (leaving the ride)
        const { error } = await supabase
          .from('ride_conversations')
          .delete()
          .eq('id', rideToDelete.id)
          .eq('sender_id', user.id);

        if (error) throw error;
        toast.success('Left the ride');
      } else if (rideToDelete.source === 'private') {
        // Delete the private request
        const { error } = await supabase
          .from('private_ride_requests')
          .delete()
          .eq('id', rideToDelete.id);

        if (error) throw error;
        toast.success('Ride cancelled');
      }

      fetchAllRides();
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
          <p className="text-muted-foreground">
            All your rides in one place
          </p>
        </div>

        {loadingData ? (
          <div className="text-center py-12">Loading...</div>
        ) : unifiedRides.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No Rides Yet"
            description="Post a ride or join someone else's to get started"
            action={{
              label: "Find Rides",
              onClick: () => navigate('/find-rides')
            }}
          />
        ) : (
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-4 pr-4">
              {unifiedRides.map((ride) => (
                <UnifiedRideCard
                  key={`${ride.source}-${ride.id}`}
                  ride={ride}
                  onCancel={() => handleCancelRide(ride)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

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