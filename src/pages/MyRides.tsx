import { useState, useEffect, useCallback } from "react";
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
  const [acceptDeclineLoading, setAcceptDeclineLoading] = useState<string | null>(null);

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

    // Collect all unique parent IDs to fetch their children
    const allParentIds = [...new Set(
      scheduleData.flatMap((r: any) => {
        const ids = [r.parent_id];
        if (r.connected_parent_id) ids.push(r.connected_parent_id);
        return ids;
      }).filter(Boolean)
    )] as string[];

    // Fetch children for all involved parents
    const { data: childrenData } = await supabase
      .from('children')
      .select('user_id, first_name, last_name, grade_level')
      .in('user_id', allParentIds);

    const childrenByParent: Record<string, { name: string; grade: string }[]> = {};
    (childrenData || []).forEach((c: any) => {
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unknown';
      const grade = c.grade_level || 'N/A';
      if (!childrenByParent[c.user_id]) childrenByParent[c.user_id] = [];
      childrenByParent[c.user_id].push({ name, grade });
    });

    const today = new Date().toISOString().split('T')[0];
    const studentDisplayName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.username || 'You';
    const studentGrade = profile?.grade_level || 'N/A';

    const rides: UnifiedRide[] = scheduleData.map((r: any) => {
      const isParentDriving = r.type === 'offer';
      const hasConnection = Boolean(r.connected_parent_id);
      const connectedParentName = r.connected_parent_first_name
        ? `${r.connected_parent_first_name} ${r.connected_parent_last_name || ''}`.trim()
        : null;

      const linkedParentKids = childrenByParent[r.parent_id] || [];
      const myKids = linkedParentKids.length > 0
        ? linkedParentKids
        : [{ name: studentDisplayName, grade: studentGrade }];
      const otherKids = r.connected_parent_id ? (childrenByParent[r.connected_parent_id] || []) : [];

      let status: UnifiedRide['status'];
      if (hasConnection) {
        status = isParentDriving ? 'posted-offering' : 'helping-out';
      } else {
        status = isParentDriving ? 'posted-offering' : 'posted-looking';
      }

      return {
        id: r.id,
        source: 'posted' as const,
        rideType: r.type as 'request' | 'offer',
        status,
        rideStatus: r.ride_date < today ? 'completed' : 'active',
        pickupLocation: r.pickup_location,
        dropoffLocation: r.dropoff_location,
        rideDate: r.ride_date,
        rideTime: r.ride_time,
        seatsAvailable: r.seats_available,
        seatsNeeded: r.seats_needed,
        isDriver: false,
        otherParent: hasConnection ? {
          id: r.connected_parent_id || r.parent_id,
          firstName: r.connected_parent_first_name || r.parent_first_name,
          lastName: r.connected_parent_last_name || r.parent_last_name,
          username: '',
          email: null,
          phone: null,
          children: otherKids,
        } : null,
        myChildren: myKids,
        originalData: r,
        _studentView: true,
        _driverName: isParentDriving
          ? `${r.parent_first_name || ''} ${r.parent_last_name || ''}`.trim()
          : connectedParentName || 'Waiting for driver',
        _studentPassengerName: studentDisplayName,
      } as UnifiedRide & { _studentView?: boolean; _driverName?: string; _studentPassengerName?: string };
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

  const handleAcceptRequest = useCallback(async (conversationId: string) => {
    setAcceptDeclineLoading(conversationId);
    try {
      // Update conversation status to accepted
      const { error } = await supabase
        .from('ride_conversations')
        .update({ status: 'accepted' })
        .eq('id', conversationId);
      if (error) throw error;

      // Get the conversation to send notification
      const { data: conv } = await supabase
        .from('ride_conversations')
        .select('sender_id, ride_id, rides(ride_date, ride_time)')
        .eq('id', conversationId)
        .single();

      if (conv) {
        const senderName = profile?.first_name
          ? `${profile.first_name} ${profile.last_name || ''}`.trim()
          : 'The ride owner';
        const rideData = conv.rides as any;
        
        try {
          await supabase.functions.invoke('create-notification', {
            body: {
              userId: conv.sender_id,
              type: 'ride_join_accepted',
              message: `✅ ${senderName} accepted your request to join the ride on ${rideData?.ride_date || 'upcoming'} at ${rideData?.ride_time || ''}`,
            }
          });
        } catch (notifErr) {
          console.warn('Failed to send acceptance notification:', notifErr);
        }
      }

      toast.success('Request accepted! The parent has been added to your ride.');
      loadRides();
    } catch (err: any) {
      toast.error('Failed to accept request: ' + err.message);
    }
    setAcceptDeclineLoading(null);
  }, [user, profile]);

  const handleDeclineRequest = useCallback(async (conversationId: string) => {
    setAcceptDeclineLoading(conversationId);
    try {
      // Update conversation status to declined
      const { data: conv } = await supabase
        .from('ride_conversations')
        .select('sender_id, ride_id, rides(ride_date, ride_time)')
        .eq('id', conversationId)
        .single();

      const { error } = await supabase
        .from('ride_conversations')
        .update({ status: 'declined' })
        .eq('id', conversationId);
      if (error) throw error;

      if (conv) {
        const senderName = profile?.first_name
          ? `${profile.first_name} ${profile.last_name || ''}`.trim()
          : 'The ride owner';
        const rideData = conv.rides as any;
        
        try {
          await supabase.functions.invoke('create-notification', {
            body: {
              userId: conv.sender_id,
              type: 'ride_join_declined',
              message: `❌ ${senderName} declined your request to join the ride on ${rideData?.ride_date || 'upcoming'}`,
            }
          });
        } catch (notifErr) {
          console.warn('Failed to send decline notification:', notifErr);
        }
      }

      toast.success('Request declined.');
      loadRides();
    } catch (err: any) {
      toast.error('Failed to decline request: ' + err.message);
    }
    setAcceptDeclineLoading(null);
  }, [user, profile]);


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
