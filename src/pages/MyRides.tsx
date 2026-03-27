import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { Car, History, Info, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { UnifiedRideCard, UnifiedRideCardSkeleton, type UnifiedRide, type CancelAction } from "@/components/UnifiedRideCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchUnifiedRides } from "@/lib/fetchUnifiedRides";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AcceptDirectRideDialog } from "@/components/AcceptDirectRideDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const MyRides = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [hasLinkedParent, setHasLinkedParent] = useState<boolean | null>(null);
  const [acceptDeclineLoading, setAcceptDeclineLoading] = useState<string | null>(null);
  const [acceptingDirectRide, setAcceptingDirectRide] = useState<UnifiedRide | null>(null);

  const isStudent = profile?.account_type === "student";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Parent rides via React Query with caching
  const { data: parentRideData, isLoading: loadingParentRides } = useQuery({
    queryKey: ['my-rides', user?.id],
    queryFn: () => fetchUnifiedRides(user!.id),
    enabled: !!user && !!profile && !isStudent,
    staleTime: 2 * 60 * 1000, // 2 minutes before considered stale
    gcTime: 5 * 60 * 1000, // keep in cache 5 minutes
  });

  const invalidateRides = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-rides'] });
    queryClient.invalidateQueries({ queryKey: ['student-rides'] });
  }, [queryClient]);

  // Student rides fetcher for React Query
  const fetchStudentRides = useCallback(async (): Promise<{ active: UnifiedRide[]; past: UnifiedRide[]; hasLinked: boolean }> => {
    if (!user || !profile) return { active: [], past: [], hasLinked: false };

    const { data: links } = await supabase
      .from('account_links')
      .select('parent_id')
      .eq('student_id', user.id)
      .eq('status', 'approved');

    if (!links || links.length === 0) {
      return { active: [], past: [], hasLinked: false };
    }

    const { data: scheduleData } = await supabase
      .rpc('get_family_schedule', { student_user_id: user.id });

    if (!scheduleData) {
      return { active: [], past: [], hasLinked: true };
    }

    const allParentIds = [...new Set(
      scheduleData.flatMap((r: any) => {
        const ids = [r.parent_id, r.user_id];
        if (r.connected_parent_id) ids.push(r.connected_parent_id);
        return ids;
      }).filter(Boolean)
    )] as string[];

    const childrenByParent: Record<string, { name: string; grade: string }[]> = {};
    const vehicleByParent: Record<string, { carMake: string | null; carModel: string | null; carColor: string | null; licensePlate: string | null }> = {};
    const phoneByParent: Record<string, string | null> = {};

    const childFetches = allParentIds.map(async (parentId) => {
      try {
        const { data } = await supabase.functions.invoke('get-parent-profile', {
          body: { parentId },
        });
        if (data?.profile) {
          if (data.profile.linked_students) {
            childrenByParent[parentId] = data.profile.linked_students.map((s: any) => ({
              name: [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unknown',
              grade: s.grade_level || 'N/A',
            }));
          }
           vehicleByParent[parentId] = {
              carMake: data.profile.car_make || null,
              carModel: data.profile.car_model || null,
              carColor: data.profile.car_color || null,
              licensePlate: data.profile.license_plate || null,
            };
            phoneByParent[parentId] = data.profile.phone_number || null;
        }
      } catch (err) {
        console.warn(`Failed to fetch children for parent ${parentId}:`, err);
      }
    });
    await Promise.all(childFetches);

    const today = new Date().toISOString().split('T')[0];
    const studentDisplayName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.username || 'You';
    const studentGrade = profile?.grade_level || 'N/A';

    const rides: UnifiedRide[] = scheduleData.map((r: any) => {
      const isParentDriving = r.type === 'offer';
      const hasConnection = Boolean(r.connected_parent_id);
      const connectedParentName = r.connected_parent_first_name
        ? `${r.connected_parent_first_name} ${r.connected_parent_last_name || ''}`.trim()
        : null;

      const rideOwnerKids = childrenByParent[r.user_id] || [];
      const linkedParentKids = childrenByParent[r.parent_id] || [];
      const connectedParentKids = r.connected_parent_id ? (childrenByParent[r.connected_parent_id] || []) : [];
      
      const allKidsSet = new Map<string, { name: string; grade: string }>();
      [...rideOwnerKids, ...linkedParentKids, ...connectedParentKids].forEach(k => {
        const key = `${k.name}-${k.grade}`.toLowerCase();
        if (!allKidsSet.has(key)) allKidsSet.set(key, k);
      });
      const allKids = Array.from(allKidsSet.values());
      
      const myKids = allKids.length > 0
        ? allKids
        : [{ name: studentDisplayName, grade: studentGrade }];
      const otherKids: { name: string; grade: string }[] = [];

      let status: UnifiedRide['status'];
      if (hasConnection) {
        status = isParentDriving ? 'posted-offering' : 'helping-out';
      } else {
        status = isParentDriving ? 'posted-offering' : 'posted-looking';
      }

      const driverId = isParentDriving ? r.parent_id : (r.connected_parent_id || null);
      const driverVehicle = driverId ? vehicleByParent[driverId] : undefined;
      const otherParentId = r.connected_parent_id || r.parent_id;
      const otherParentVehicle = vehicleByParent[otherParentId];

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
          phone: phoneByParent[r.connected_parent_id || r.parent_id] || null,
          children: otherKids,
          carMake: otherParentVehicle?.carMake || null,
          carModel: otherParentVehicle?.carModel || null,
          carColor: otherParentVehicle?.carColor || null,
          licensePlate: otherParentVehicle?.licensePlate || null,
        } : null,
        myChildren: myKids,
        myCarInfo: driverVehicle || undefined,
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

    return {
      active: rides.filter(r => r.rideStatus === 'active' && r.rideDate >= today),
      past: rides.filter(r => r.rideStatus !== 'active' || r.rideDate < today).reverse(),
      hasLinked: true,
    };
  }, [user, profile]);

  const { data: studentRideData, isLoading: loadingStudentRides } = useQuery({
    queryKey: ['student-rides', user?.id],
    queryFn: fetchStudentRides,
    enabled: !!user && !!profile && isStudent,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Update hasLinkedParent from student query result
  useEffect(() => {
    if (studentRideData) {
      setHasLinkedParent(studentRideData.hasLinked);
    }
  }, [studentRideData]);

  // Derive active/past rides from query data
  const activeRides = isStudent
    ? (studentRideData?.active || [])
    : (parentRideData?.active || []);
  const pastRides = isStudent
    ? (studentRideData?.past || [])
    : (parentRideData?.past || []);
  const loadingData = isStudent ? loadingStudentRides : loadingParentRides;

  const getMyName = () => {
    return profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'A parent';
  };

  const sendNotification = async (userId: string, type: string, message: string) => {
    try {
      await supabase.functions.invoke('create-notification', {
        body: { userId, type, message },
      });
    } catch (err) {
      console.warn('Failed to send notification:', err);
    }
  };

  const handleCancelAction = useCallback(async (ride: UnifiedRide, action: CancelAction) => {
    if (!user) return;

    try {
      switch (action) {
        case 'cancel-offer': {
          // Driver cancels their ride offer - permanently delete
          // First notify confirmed passenger if one exists
          if (ride.otherParent) {
            await sendNotification(
              ride.otherParent.id,
              'ride_cancelled',
              `❌ ${getMyName()} has cancelled the ride offer you were part of. Please find an alternative ride in Family Carpools.`
            );
          }
          // Also notify all pending requesters
          const { data: pendingConvs } = await supabase
            .from('ride_conversations')
            .select('sender_id')
            .eq('ride_id', ride.id)
            .eq('status', 'pending');
          if (pendingConvs) {
            for (const conv of pendingConvs) {
              if (conv.sender_id !== ride.otherParent?.id) {
                await sendNotification(
                  conv.sender_id,
                  'ride_cancelled',
                  `❌ ${getMyName()} has cancelled the ride offer you requested to join.`
                );
              }
            }
          }
          // Delete all chat messages for this ride
          await supabase
            .from('ride_messages' as any)
            .delete()
            .eq('ride_ref_id', ride.id)
            .eq('ride_source', 'public');
          // Delete all conversations for this ride
          await supabase
            .from('ride_conversations')
            .delete()
            .eq('ride_id', ride.id);
          // Permanently delete the ride
          const { error } = await supabase
            .from('rides')
            .delete()
            .eq('id', ride.id)
            .eq('user_id', user.id);
          if (error) throw error;
          toast.success('Ride offer cancelled and removed');
          break;
        }

        case 'leave-offer': {
          const conv = ride.originalData?.conversation;
          if (!conv) break;
          const rideId = conv.ride_id;
          await supabase.rpc('reset_ride_fulfillment', { p_ride_id: rideId });
          // Delete chat messages
          await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', rideId).eq('ride_source', 'public');
          const { error } = await supabase
            .from('ride_conversations')
            .delete()
            .eq('id', conv.id);
          if (error) throw error;
          // Notify the ride owner
          const rideOwnerId = ride.otherParent?.id;
          if (rideOwnerId) {
            await sendNotification(
              rideOwnerId,
              'ride_left',
              `🔄 ${getMyName()} has left your ride. Your ride has been reset and is now open in Family Carpools for others to join.`
            );
          }
          toast.success('You have left the ride');
          break;
        }

        case 'cancel-request': {
          // Owner cancels their ride request - permanently delete
          // Notify confirmed helper if one exists
          if (ride.otherParent) {
            await sendNotification(
              ride.otherParent.id,
              'ride_cancelled',
              `❌ ${getMyName()} has cancelled their ride request that you were fulfilling.`
            );
          }
          // Delete chat messages and conversations for this ride
          await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', ride.id).eq('ride_source', 'public');
          await supabase
            .from('ride_conversations')
            .delete()
            .eq('ride_id', ride.id);
          const { error } = await supabase
            .from('rides')
            .delete()
            .eq('id', ride.id)
            .eq('user_id', user.id);
          if (error) throw error;
          toast.success('Ride request cancelled and removed');
          break;
        }

        case 'leave-request': {
          const conv = ride.originalData?.conversation;
          if (!conv) break;
          const rideId = conv.ride_id;
          await supabase.rpc('reset_ride_fulfillment', { p_ride_id: rideId });
          await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', rideId).eq('ride_source', 'public');
          const { error } = await supabase
            .from('ride_conversations')
            .delete()
            .eq('id', conv.id);
          if (error) throw error;
          // Notify the requester
          const requesterId = ride.otherParent?.id;
          if (requesterId) {
            await sendNotification(
              requesterId,
              'ride_left',
              `🔄 ${getMyName()} is no longer able to fulfill your request. Your request has been reset and is now open in Family Carpools for others to help.`
            );
          }
          toast.success('You have left the ride');
          break;
        }
        case 'cancel-direct': {
          await handleCancelDirect(ride);
          return;
        }
      }

      invalidateRides();
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
    }
  }, [user, profile]);

  const handleAcceptRequest = useCallback(async (conversationId: string) => {
    setAcceptDeclineLoading(conversationId);
    try {
      const { error } = await supabase
        .from('ride_conversations')
        .update({ status: 'accepted' })
        .eq('id', conversationId);
      if (error) throw error;

      const { data: conv } = await supabase
        .from('ride_conversations')
        .select('sender_id, ride_id, rides(ride_date, ride_time)')
        .eq('id', conversationId)
        .single();

      if (conv) {
        const { data: otherPending } = await supabase
          .from('ride_conversations')
          .select('id, sender_id')
          .eq('ride_id', conv.ride_id)
          .eq('status', 'pending')
          .neq('id', conversationId);

        if (otherPending && otherPending.length > 0) {
          await supabase
            .from('ride_conversations')
            .update({ status: 'declined' })
            .eq('ride_id', conv.ride_id)
            .eq('status', 'pending')
            .neq('id', conversationId);

          const senderName = getMyName();
          const rideData = conv.rides as any;

          for (const pending of otherPending) {
            await sendNotification(
              pending.sender_id,
              'ride_join_declined',
              `❌ ${senderName} has filled the ride on ${rideData?.ride_date || 'upcoming'} — your request was automatically declined.`
            );
          }
        }

        const senderName = getMyName();
        const rideData = conv.rides as any;
        await sendNotification(
          conv.sender_id,
          'ride_join_accepted',
          `✅ ${senderName} accepted your request to join the ride on ${rideData?.ride_date || 'upcoming'} at ${rideData?.ride_time || ''}`
        );
      }

      toast.success('Request accepted! The parent has been added to your ride.');
      invalidateRides();
    } catch (err: any) {
      toast.error('Failed to accept request: ' + err.message);
    }
    setAcceptDeclineLoading(null);
  }, [user, profile]);

  const handleDeclineRequest = useCallback(async (conversationId: string) => {
    setAcceptDeclineLoading(conversationId);
    try {
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
        const senderName = getMyName();
        const rideData = conv.rides as any;
        await sendNotification(
          conv.sender_id,
          'ride_join_declined',
          `❌ ${senderName} declined your request to join the ride on ${rideData?.ride_date || 'upcoming'}`
        );
      }

      toast.success('Request declined.');
      invalidateRides();
    } catch (err: any) {
      toast.error('Failed to decline request: ' + err.message);
    }
    setAcceptDeclineLoading(null);
  }, [user, profile]);

  const handleAcceptDirect = useCallback(async (requestId: string) => {
    // Find the ride to show children selector
    const ride = activeRides.find(r => r.id === requestId);
    if (ride) {
      setAcceptingDirectRide(ride);
    }
  }, [activeRides]);

  const confirmAcceptDirect = useCallback(async (selectedChildIds: string[], vehicleInfo?: any) => {
    if (!acceptingDirectRide) return;
    const requestId = acceptingDirectRide.id;
    setAcceptDeclineLoading(requestId);
    try {
      const updateData: any = { 
        status: 'accepted', 
        responded_at: new Date().toISOString(),
        recipient_selected_children: selectedChildIds,
      };
      // If the acceptor is the driver (accepting a ride request), save their vehicle
      if (vehicleInfo) {
        updateData.vehicle_info = {
          car_make: vehicleInfo.car_make,
          car_model: vehicleInfo.car_model,
          car_color: vehicleInfo.car_color,
          license_plate: vehicleInfo.license_plate,
          vehicle_id: vehicleInfo.vehicle_id,
        };
      }
      const { error } = await supabase
        .from('private_ride_requests')
        .update(updateData)
        .eq('id', requestId);
      if (error) throw error;

      const { data: req } = await supabase
        .from('private_ride_requests')
        .select('sender_id, ride_date')
        .eq('id', requestId)
        .single();

      if (req) {
        const myName = getMyName();
        await sendNotification(
          req.sender_id,
          'direct_ride_accepted',
          `✅ ${myName} accepted your direct ride for ${req.ride_date}`
        );
      }

      toast.success('Direct ride accepted!');
      setAcceptingDirectRide(null);
      invalidateRides();
    } catch (err: any) {
      toast.error('Failed to accept: ' + err.message);
    }
    setAcceptDeclineLoading(null);
  }, [acceptingDirectRide, user, profile]);

  const handleDeclineDirect = useCallback(async (requestId: string) => {
    setAcceptDeclineLoading(requestId);
    try {
      const { data: req } = await supabase
        .from('private_ride_requests')
        .select('sender_id, ride_date, request_type')
        .eq('id', requestId)
        .single();

      const { error } = await supabase
        .from('private_ride_requests')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;

      if (req) {
        const myName = getMyName();
        await sendNotification(
          req.sender_id,
          'direct_ride_declined',
          `❌ ${myName} has declined your direct ride ${req.request_type} for ${req.ride_date}`
        );
      }

      toast.success('Direct ride declined.');
      invalidateRides();
    } catch (err: any) {
      toast.error('Failed to decline: ' + err.message);
    }
    setAcceptDeclineLoading(null);
  }, [user, profile]);

  const handleCancelDirect = useCallback(async (ride: UnifiedRide) => {
    try {
      const req = ride.originalData;
      const isSender = req.sender_id === user?.id;

      // Delete chat messages
      await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', ride.id).eq('ride_source', 'private');

      const { error } = await supabase
        .from('private_ride_requests')
        .update({ status: 'cancelled' } as any)
        .eq('id', ride.id);
      if (error) throw error;

      const otherId = isSender ? req.recipient_id : req.sender_id;
      const myName = getMyName();
      const message = isSender
        ? `❌ ${myName} has cancelled the direct ride they sent you`
        : `❌ ${myName} has cancelled the direct ride you sent them`;

      await sendNotification(otherId, 'direct_ride_cancelled', message);

      toast.success('Direct ride cancelled');
      invalidateRides();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  }, [user, profile]);

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
            onClick: () => navigate('/family-carpools')
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
              onCancel={!isStudent && !isPast ? handleCancelAction : undefined}
              isPast={isPast}
              onAcceptRequest={!isStudent ? handleAcceptRequest : undefined}
              onDeclineRequest={!isStudent ? handleDeclineRequest : undefined}
              onAcceptDirect={!isStudent ? handleAcceptDirect : undefined}
              onDeclineDirect={!isStudent ? handleDeclineDirect : undefined}
              acceptDeclineLoading={acceptDeclineLoading}
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

        {/* Accept Direct Ride Dialog with Children Selector */}
        {acceptingDirectRide && (
          <AcceptDirectRideDialog
            open={!!acceptingDirectRide}
            onClose={() => setAcceptingDirectRide(null)}
            onConfirm={confirmAcceptDirect}
            senderName={acceptingDirectRide.otherParent ? `${acceptingDirectRide.otherParent.firstName || ''} ${acceptingDirectRide.otherParent.lastName || ''}`.trim() : 'Unknown'}
            rideType={acceptingDirectRide.rideType}
            maxSeats={acceptingDirectRide.seatsAvailable || acceptingDirectRide.seatsNeeded || null}
            loading={acceptDeclineLoading === acceptingDirectRide.id}
            isAcceptorDriver={acceptingDirectRide.rideType === 'request'}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyRides;
