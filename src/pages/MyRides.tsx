import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { Car, History, Info, LinkIcon, RefreshCw, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { UnifiedRideCard, UnifiedRideCardSkeleton, type UnifiedRide, type CancelAction } from "@/components/UnifiedRideCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchUnifiedRides, isRidePast } from "@/lib/fetchUnifiedRides";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AcceptDirectRideDialog } from "@/components/AcceptDirectRideDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addWeeks, startOfToday } from "date-fns";

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

  const [clearingPast, setClearingPast] = useState(false);

  // Parent rides via React Query with caching
  const { data: parentRideData, isLoading: loadingParentRides } = useQuery({
    queryKey: ['my-rides', user?.id],
    queryFn: () => fetchUnifiedRides(user!.id),
    enabled: !!user && !!profile && !isStudent,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const [refreshing, setRefreshing] = useState(false);

  const invalidateRides = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-rides'] });
    queryClient.invalidateQueries({ queryKey: ['student-rides'] });
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: isStudent ? ['student-rides'] : ['my-rides'] });
    setRefreshing(false);
    toast.success('Rides updated', { duration: 2000 });
  }, [queryClient, isStudent]);

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
            console.log(`[Student MyRides] Phone for ${parentId}:`, data.profile.phone_number);
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
        rideStatus: isRidePast(r.ride_date, r.ride_time) ? 'completed' : 'active',
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

    // ── Fetch series rides for student ──
    const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const { data: seriesData } = await supabase.rpc('get_student_series_rides', { student_user_id: user.id });
    
    console.log('[Student MyRides] Series data:', seriesData);

    if (seriesData && seriesData.length > 0) {
      // Build cancelled set
      const cancelledSet = new Set(
        seriesData
          .filter((r: any) => r.cancelled_date)
          .map((r: any) => `${r.cancelled_schedule_id}-${r.cancelled_date}-${r.cancelled_day}`)
      );

      // Get unique schedules
      const scheduleMap = new Map<string, any>();
      for (const row of seriesData) {
        if (!scheduleMap.has(row.schedule_id)) {
          scheduleMap.set(row.schedule_id, row);
        }
      }

      // Get all parent IDs for profiles, vehicles, children
      const seriesParentIds = new Set<string>();
      for (const s of scheduleMap.values()) {
        seriesParentIds.add(s.parent_a_id);
        seriesParentIds.add(s.parent_b_id);
      }

      // Fetch profiles, vehicles, and confirmed child selections for series parents
      const seriesParentIdArr = [...seriesParentIds];
      const seriesSpaceIds = [...new Set(Array.from(scheduleMap.values()).map((s: any) => s.space_id))];
      const [{ data: seriesVehicles }, { data: seriesChildSels }] = await Promise.all([
        supabase
          .from('vehicles' as any)
          .select('user_id, car_make, car_model, car_color, license_plate, is_primary')
          .in('user_id', seriesParentIdArr)
          .then(r => r),
        supabase.rpc('get_student_series_child_selections', { student_user_id: user.id }),
      ]);

      // Fetch all series parent profiles via edge function
      const profileMap: Record<string, any> = {};
      await Promise.all(seriesParentIdArr.map(async (pid) => {
        try {
          const { data } = await supabase.functions.invoke('get-parent-profile', { body: { parentId: pid } });
          if (data?.profile) profileMap[pid] = data.profile;
        } catch {}
      }));

      // Build vehicles map
      const vMap: Record<string, any[]> = {};
      if (seriesVehicles) {
        for (const v of seriesVehicles as any[]) {
          if (!vMap[v.user_id]) vMap[v.user_id] = [];
          vMap[v.user_id].push(v);
        }
      }

      // Build child selection map from the same confirmed source used for parent logic
      const selMap: Record<string, Record<string, string[]>> = {};
      if (seriesChildSels) {
        for (const sel of seriesChildSels as any[]) {
          if (!selMap[sel.space_id]) selMap[sel.space_id] = {};
          if (!selMap[sel.space_id][sel.parent_id]) selMap[sel.space_id][sel.parent_id] = [];
          selMap[sel.space_id][sel.parent_id].push(sel.child_id);
        }
      }

      // Build children map from parent profile edge function data (service-role backed)
      const seriesChildrenByParent: Record<string, { id: string; name: string; grade: string }[]> = {};
      for (const pid of seriesParentIdArr) {
        const prof = profileMap[pid];
        if (prof?.linked_students?.length) {
          seriesChildrenByParent[pid] = prof.linked_students.map((s: any) => ({
            id: s.id,
            name: [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unknown',
            grade: s.grade_level || 'N/A',
          }));
        }
      }

      // Generate series ride occurrences
      for (const [schedId, sched] of scheduleMap) {
        const assignments = (sched.day_assignments as any[]) || [];
        const days = assignments.map((a: any) => a.day);
        const parentAId = sched.parent_a_id;
        const parentBId = sched.parent_b_id;
        const spaceSelections = selMap[sched.space_id] || {};

        // Generate 4 weeks of occurrences
        const todayDate = startOfToday();
        for (let w = 0; w < 4; w++) {
          for (const day of days) {
            const dayIndex = DAY_MAP[day];
            if (dayIndex === undefined) continue;
            const todayIndex = todayDate.getDay();
            let daysUntil = dayIndex - todayIndex;
            if (w === 0 && daysUntil < 0) continue;
            const date = addDays(addWeeks(todayDate, w), daysUntil);
            if (date < todayDate) continue;
            const dateStr = format(date, 'yyyy-MM-dd');

            const cancelKey = `${schedId}-${dateStr}-${day}`;
            if (cancelledSet.has(cancelKey)) continue;

            const assignment = assignments.find((a: any) => a.day === day);
            if (!assignment) continue;

            const driverId = assignment.driver_id;
            const passengerId = driverId === parentAId ? parentBId : parentAId;
            const isWed = day === 'Wed';

            let pickupTime: string | null = null;
            if (driverId === sched.proposer_id) {
              pickupTime = isWed ? sched.proposer_wednesday_time : sched.proposer_regular_time;
            } else {
              pickupTime = isWed ? sched.recipient_wednesday_time : sched.recipient_regular_time;
            }
            if (!pickupTime) pickupTime = '08:00';

            // Pickup = passenger parent's home address
            const passengerProfile = profileMap[passengerId];
            const pickupAddress = passengerProfile?.home_address || 'Passenger home address';

            // Build children list from confirmed series child selections (mirror parent My Rides)
            const parentAChildIds = spaceSelections[parentAId] || [];
            const parentBChildIds = spaceSelections[parentBId] || [];
            const parentAHasSubmitted = parentAChildIds.length > 0;
            const parentBHasSubmitted = parentBChildIds.length > 0;

            const parentAKids = parentAHasSubmitted
              ? (seriesChildrenByParent[parentAId] || [])
                  .filter(c => parentAChildIds.includes(c.id))
                  .map(c => ({ name: c.name, grade: c.grade }))
              : [];
            const parentBKids = parentBHasSubmitted
              ? (seriesChildrenByParent[parentBId] || [])
                  .filter(c => parentBChildIds.includes(c.id))
                  .map(c => ({ name: c.name, grade: c.grade }))
              : [];
            const allSeriesKids = [...parentAKids, ...parentBKids].filter(
              (k, i, arr) => i === arr.findIndex(x => `${x.name}-${x.grade}` === `${k.name}-${k.grade}`)
            );

            const parentAName = profileMap[parentAId] ? [profileMap[parentAId].first_name, profileMap[parentAId].last_name].filter(Boolean).join(' ') : 'Parent';
            const parentBName = profileMap[parentBId] ? [profileMap[parentBId].first_name, profileMap[parentBId].last_name].filter(Boolean).join(' ') : 'Parent';
            let pendingChildrenMessage: string | null = null;
            if (allSeriesKids.length === 0) {
              if (!parentAHasSubmitted && !parentBHasSubmitted) {
                pendingChildrenMessage = `Pending — awaiting children confirmation from both parents`;
              } else if (!parentAHasSubmitted) {
                pendingChildrenMessage = `Pending — awaiting children confirmation from ${parentAName}`;
              } else if (!parentBHasSubmitted) {
                pendingChildrenMessage = `Pending — awaiting children confirmation from ${parentBName}`;
              }
            }

            // Driver info
            const driverProfile = profileMap[driverId];
            const driverName = driverProfile
              ? [driverProfile.first_name, driverProfile.last_name].filter(Boolean).join(' ')
              : 'Driver';
            const driverVehicles = vMap[driverId] || [];
            const primaryVehicle = driverVehicles.find((v: any) => v.is_primary) || driverVehicles[0];

            // Other parent (the one not linked to student — show contact for)
            const linkedParentIds = links.map((l: any) => l.parent_id);
            const otherSeriesParentId = linkedParentIds.includes(parentAId) ? parentBId : parentAId;
            const otherSeriesProfile = profileMap[otherSeriesParentId];

            rides.push({
              id: `series-${schedId}-${dateStr}-${day}`,
              source: 'series' as any,
              rideType: 'offer',
              status: 'confirmed',
              rideStatus: 'active',
              pickupLocation: pickupAddress,
              dropoffLocation: 'Chadwick School — 26800 S Academy Dr, Palos Verdes Peninsula, CA 90274',
              rideDate: dateStr,
              rideTime: pickupTime,
              seatsAvailable: null,
              seatsNeeded: null,
              isDriver: false,
              otherParent: otherSeriesProfile ? {
                id: otherSeriesParentId,
                firstName: otherSeriesProfile.first_name || null,
                lastName: otherSeriesProfile.last_name || null,
                username: otherSeriesProfile.username || '',
                email: null,
                phone: otherSeriesProfile.phone_number || null,
                children: [],
                carMake: null,
                carModel: null,
                carColor: null,
                licensePlate: null,
              } : null,
              myChildren: allSeriesKids,
              myCarInfo: primaryVehicle ? {
                carMake: primaryVehicle.car_make,
                carModel: primaryVehicle.car_model,
                carColor: primaryVehicle.car_color,
                licensePlate: primaryVehicle.license_plate,
              } : undefined,
              originalData: {
                _seriesRide: true,
                scheduleId: schedId,
                spaceId: sched.space_id,
                day,
                date: dateStr,
                driverId,
                otherParentId: otherSeriesParentId,
                driverVehicles: driverVehicles.map((v: any) => ({
                  car_make: v.car_make,
                  car_model: v.car_model,
                  car_color: v.car_color,
                  license_plate: v.license_plate,
                  is_primary: v.is_primary,
                })),
                pendingChildrenMessage,
              },
              _studentView: true,
              _driverName: driverName,
              _studentPassengerName: studentDisplayName,
            } as any);
          }
        }
      }
    }

    rides.sort((a, b) => {
      const dateA = new Date(`${a.rideDate}T${a.rideTime}`);
      const dateB = new Date(`${b.rideDate}T${b.rideTime}`);
      return dateA.getTime() - dateB.getTime();
    });

    return {
      active: rides.filter(r => r.rideStatus === 'active' && !isRidePast(r.rideDate, r.rideTime)),
      past: rides.filter(r => r.rideStatus !== 'active' || isRidePast(r.rideDate, r.rideTime)).reverse(),
      hasLinked: true,
    };
  }, [user, profile]);

  const { data: studentRideData, isLoading: loadingStudentRides } = useQuery({
    queryKey: ['student-rides', user?.id],
    queryFn: fetchStudentRides,
    enabled: !!user && !!profile && isStudent,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Update hasLinkedParent from student query result
  useEffect(() => {
    if (studentRideData) {
      setHasLinkedParent(studentRideData.hasLinked);
    }
  }, [studentRideData]);

  // ── Real-time 1-minute tick to re-evaluate active/past split ──
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000); // every 60s
    return () => clearInterval(interval);
  }, []);

  // Derive active/past rides from query data, re-evaluated every tick
  const allParentRides = parentRideData ? [...parentRideData.active, ...parentRideData.past] : [];
  const allStudentRides = studentRideData ? [...studentRideData.active, ...studentRideData.past] : [];
  const allRides = isStudent ? allStudentRides : allParentRides;

  const activeRides = allRides.filter(r => r.rideStatus === 'active' && !isRidePast(r.rideDate, r.rideTime));
  const pastRides = allRides.filter(r => r.rideStatus !== 'active' || isRidePast(r.rideDate, r.rideTime))
    .sort((a, b) => new Date(`${b.rideDate}T${b.rideTime}`).getTime() - new Date(`${a.rideDate}T${a.rideTime}`).getTime());
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
        case 'cancel-series': {
          // Driver cancels a single series occurrence
          const seriesData = ride.originalData;
          if (!seriesData?._seriesRide) break;
          
          const dateObj = new Date(seriesData.date + 'T00:00:00');
          const dayName = seriesData.day;
          const dateStr = seriesData.date;
          
          const { error } = await supabase.from('schedule_cancellations').insert({
            schedule_id: seriesData.scheduleId,
            cancelled_date: dateStr,
            cancelled_day: dayName,
            cancelled_by: user.id,
          });
          
          if (error) {
            toast.error('Already cancelled for that date');
            break;
          }
          
          const otherId = seriesData.otherParentId;
          const formattedDate = format(dateObj, 'MMMM d, yyyy');
          await sendNotification(
            otherId,
            'schedule_cancel_one',
            `📅 ${getMyName()} has cancelled the ${dayName} ride on ${formattedDate}. The rest of your carpool series continues as scheduled.`
          );
          
          toast.success(`Cancelled ride on ${formattedDate}`);
          break;
        }
        case 'leave-series': {
          // Passenger leaves a single series occurrence
          const seriesData = ride.originalData;
          if (!seriesData?._seriesRide) break;
          
          const dateObj = new Date(seriesData.date + 'T00:00:00');
          const dayName = seriesData.day;
          const dateStr = seriesData.date;
          
          const { error } = await supabase.from('schedule_cancellations').insert({
            schedule_id: seriesData.scheduleId,
            cancelled_date: dateStr,
            cancelled_day: dayName,
            cancelled_by: user.id,
          });
          
          if (error) {
            toast.error('Already left for that date');
            break;
          }
          
          const otherId = seriesData.otherParentId;
          const formattedDate = format(dateObj, 'MMMM d, yyyy');
          await sendNotification(
            otherId,
            'schedule_leave_one',
            `📅 ${getMyName()} has left the ${dayName} ride on ${formattedDate}. The rest of your carpool series continues as scheduled.`
          );
          
          toast.success(`Left ride on ${formattedDate}`);
          break;
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

  const handleClearPastRides = useCallback(async () => {
    if (!user) return;
    setClearingPast(true);
    try {
      const pastPublicIds = pastRides
        .filter(r => r.source === 'posted' && r.originalData?.user_id === user.id)
        .map(r => r.id);

      if (pastPublicIds.length > 0) {
        for (const rideId of pastPublicIds) {
          await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', rideId).eq('ride_source', 'public');
          await supabase.from('ride_conversations').delete().eq('ride_id', rideId);
        }
        await supabase.from('rides').delete().in('id', pastPublicIds);
      }

      const pastDirectIds = pastRides
        .filter(r => r.source === 'direct' && (r.originalData?.sender_id === user.id || r.originalData?.recipient_id === user.id))
        .filter(r => ['cancelled', 'completed', 'declined'].includes(r.originalData?.status))
        .map(r => r.id);

      if (pastDirectIds.length > 0) {
        for (const rideId of pastDirectIds) {
          await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', rideId).eq('ride_source', 'private');
        }
        await supabase.from('private_ride_requests').delete().in('id', pastDirectIds);
      }

      toast.success('Past rides cleared');
      invalidateRides();
    } catch (err: any) {
      toast.error('Failed to clear past rides: ' + err.message);
    }
    setClearingPast(false);
  }, [user, pastRides, invalidateRides]);


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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Rides</h1>
            <p className="text-muted-foreground">
              {isStudent
                ? "Rides scheduled by your parent"
                : "All your rides in one place"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={refreshing || loadingData}
            onClick={handleRefresh}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
