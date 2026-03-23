import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { Car, History, Info, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { DeleteRideDialog } from "@/components/ConfirmDialogs";
import { UnifiedRideCard, UnifiedRideCardSkeleton, type UnifiedRide } from "@/components/UnifiedRideCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchUnifiedRides } from "@/lib/fetchUnifiedRides";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [hasLinkedParent, setHasLinkedParent] = useState<boolean | null>(null);

  const isStudent = profile?.account_type === "student";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && profile) {
      if (isStudent) {
        loadStudentRides();
      } else {
        loadRides();
      }
    }
  }, [user, profile]);

  const loadRides = async () => {
    if (!user) return;
    setLoadingData(true);
    const { active, past } = await fetchUnifiedRides(user.id);
    setActiveRides(active);
    setPastRides(past);
    setLoadingData(false);
  };

  const loadStudentRides = async () => {
    if (!user) return;
    setLoadingData(true);

    // Check if student has linked parents
    const { data: links } = await supabase
      .from('account_links')
      .select('parent_id')
      .eq('student_id', user.id)
      .eq('status', 'approved');

    if (!links || links.length === 0) {
      setHasLinkedParent(false);
      setLoadingData(false);
      return;
    }

    setHasLinkedParent(true);

    // Use get_family_schedule RPC
    const { data: scheduleData } = await supabase
      .rpc('get_family_schedule', { student_user_id: user.id });

    if (!scheduleData) {
      setActiveRides([]);
      setPastRides([]);
      setLoadingData(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const rides: UnifiedRide[] = scheduleData.map((r: any) => {
      const isParentDriving = r.type === 'offer';
      const connectedParentName = r.connected_parent_first_name && r.connected_parent_last_name
        ? `${r.connected_parent_first_name} ${r.connected_parent_last_name}`
        : null;

      return {
        id: r.id,
        source: 'posted' as const,
        rideType: r.type as 'request' | 'offer',
        status: isParentDriving ? 'posted-offering' : 'posted-looking',
        rideStatus: r.ride_date < today ? 'completed' : 'active',
        pickupLocation: r.pickup_location,
        dropoffLocation: r.dropoff_location,
        rideDate: r.ride_date,
        rideTime: r.ride_time,
        seatsAvailable: r.seats_available,
        seatsNeeded: r.seats_needed,
        isDriver: false, // student is never the driver
        otherParent: {
          id: r.parent_id,
          firstName: r.parent_first_name,
          lastName: r.parent_last_name,
          username: r.parent_email || '',
          email: r.parent_email,
          phone: null,
          children: [],
        },
        myChildren: [],
        originalData: r,
        // Custom field for student view
        _studentView: true,
        _driverName: isParentDriving
          ? `${r.parent_first_name || ''} ${r.parent_last_name || ''}`.trim()
          : connectedParentName || 'Another Parent',
      } as UnifiedRide & { _studentView?: boolean; _driverName?: string };
    });

    rides.sort((a, b) => {
      const dateA = new Date(`${a.rideDate}T${a.rideTime}`);
      const dateB = new Date(`${b.rideDate}T${b.rideTime}`);
      return dateA.getTime() - dateB.getTime();
    });

    setActiveRides(rides.filter(r => r.rideStatus === 'active' && r.rideDate >= today));
    setPastRides(rides.filter(r => r.rideStatus !== 'active' || r.rideDate < today).reverse());
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

  // Student with no linked parent
  if (isStudent && hasLinkedParent === false) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs items={[{ label: "My Rides" }]} />
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">My Rides</h1>
          </div>
          <EmptyState
            icon={LinkIcon}
            title="No Parent Account Linked"
            description="Link to your parent's account to see rides they've scheduled for you."
            action={{
              label: "Link Parent Account",
              onClick: () => navigate('/profile')
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  const renderRideList = (rides: UnifiedRide[], isPast: boolean) => {
    if (loadingData) {
      return (
        <div className="space-y-4 pr-4">
          {[1, 2, 3].map(i => <UnifiedRideCardSkeleton key={i} />)}
        </div>
      );
    }

    if (rides.length === 0) {
      return (
        <EmptyState
          icon={isPast ? History : Car}
          title={isPast ? "No Past Rides" : "No Scheduled Rides"}
          description={
            isStudent
              ? isPast
                ? "Past rides will appear here"
                : "No rides scheduled yet. Ask your parent to schedule a ride for you."
              : isPast
                ? "Completed and cancelled rides will appear here"
                : "Post a ride or join someone else's to get started"
          }
          action={!isPast && !isStudent ? {
            label: "Find Rides",
            onClick: () => navigate('/find-rides')
          } : undefined}
        />
      );
    }

    return (
      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="space-y-4 pr-4">
          {rides.map((ride) => (
            <UnifiedRideCard
              key={`${ride.source}-${ride.id}`}
              ride={ride}
              onCancel={!isStudent && !isPast ? () => handleCancelRide(ride) : undefined}
              isPast={isPast}
            />
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-4xl">
        <Breadcrumbs items={[{ label: "My Rides" }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Rides</h1>
          <p className="text-muted-foreground">
            {isStudent
              ? "Rides scheduled by your parent"
              : "All your rides in one place"}
          </p>
        </div>

        {isStudent && (
          <Alert className="mb-4 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
              These rides were arranged by your linked parent account. Contact your parent to make changes.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="gap-1.5">
              <Car className="h-4 w-4" />
              {isStudent ? 'Upcoming' : 'Active'} ({activeRides.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-1.5">
              <History className="h-4 w-4" />
              Past ({pastRides.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {renderRideList(activeRides, false)}
          </TabsContent>

          <TabsContent value="past">
            {renderRideList(pastRides, true)}
          </TabsContent>
        </Tabs>

        {!isStudent && (
          <DeleteRideDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={confirmCancelRide}
            loading={deleteLoading}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyRides;
