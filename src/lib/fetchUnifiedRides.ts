import { supabase } from "@/integrations/supabase/client";
import type { UnifiedRide, ParticipantInfo, PendingJoinRequest } from "@/components/UnifiedRideCard";
import { addDays, format, startOfToday, addWeeks } from "date-fns";

interface FetchResult {
  active: UnifiedRide[];
  past: UnifiedRide[];
}

async function fetchProfilesForIds(ids: string[]): Promise<Record<string, any>> {
  if (ids.length === 0) return {};
  
  const [{ data: profiles }, { data: users }] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, username, phone_number, share_phone, share_email, car_make, car_model, car_color, license_plate, home_address').in('id', ids),
    supabase.from('users').select('user_id, email').in('user_id', ids),
  ]);

  if (!profiles) return {};
  return profiles.reduce((acc, p) => {
    const email = users?.find(u => u.user_id === p.id)?.email;
    acc[p.id] = { ...p, email };
    return acc;
  }, {} as Record<string, any>);
}

async function fetchChildrenForIds(ids: string[]): Promise<Record<string, { id: string; name: string; grade: string }[]>> {
  if (ids.length === 0) return {};
  const { data } = await supabase
    .from('children')
    .select('id, user_id, first_name, last_name, grade_level')
    .in('user_id', ids);
  
  if (!data) return {};
  return data.reduce((acc, c) => {
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unknown';
    const grade = c.grade_level || 'N/A';
    if (!acc[c.user_id]) acc[c.user_id] = [];
    acc[c.user_id].push({ id: c.id, name, grade });
    return acc;
  }, {} as Record<string, { id: string; name: string; grade: string }[]>);
}

function filterChildrenBySelection(
  allChildren: { id?: string; name: string; grade: string }[],
  selectedChildIds: string[] | null | undefined
): { name: string; grade: string }[] {
  if (!selectedChildIds || selectedChildIds.length === 0) {
    return allChildren.map(({ name, grade }) => ({ name, grade }));
  }
  return allChildren
    .filter(c => c.id && selectedChildIds.includes(c.id))
    .map(({ name, grade }) => ({ name, grade }));
}

function toParticipant(p: any, children: { name: string; grade: string }[]): ParticipantInfo {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    username: p.username,
    email: p.share_email ? p.email : null,
    phone: p.phone_number || null,
    children: children || [],
    carMake: p.car_make || null,
    carModel: p.car_model || null,
    carColor: p.car_color || null,
    licensePlate: p.license_plate || null,
  };
}

function extractCarInfo(vehicleInfoJson: any, profileFallback?: any): UnifiedRide['myCarInfo'] {
  if (vehicleInfoJson && typeof vehicleInfoJson === 'object') {
    return {
      carMake: vehicleInfoJson.car_make || null,
      carModel: vehicleInfoJson.car_model || null,
      carColor: vehicleInfoJson.car_color || null,
      licensePlate: vehicleInfoJson.license_plate || null,
    };
  }
  if (profileFallback) {
    return {
      carMake: profileFallback.car_make || null,
      carModel: profileFallback.car_model || null,
      carColor: profileFallback.car_color || null,
      licensePlate: profileFallback.license_plate || null,
    };
  }
  return undefined;
}

const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function getNextOccurrences(
  days: string[],
  weeksAhead: number = 4
): { day: string; date: string }[] {
  const today = startOfToday();
  const results: { day: string; date: string }[] = [];
  
  for (let w = 0; w < weeksAhead; w++) {
    for (const day of days) {
      const dayIndex = DAY_MAP[day];
      if (dayIndex === undefined) continue;
      
      const todayIndex = today.getDay();
      let daysUntil = dayIndex - todayIndex;
      if (w === 0 && daysUntil < 0) continue; // skip past days in current week
      if (w === 0 && daysUntil === 0) {
        // include today
      }
      
      const date = addDays(addWeeks(today, w), daysUntil);
      if (date >= today) {
        results.push({ day, date: format(date, 'yyyy-MM-dd') });
      }
    }
  }
  
  return results;
}

export async function fetchUnifiedRides(userId: string): Promise<FetchResult> {
  const allRides: UnifiedRide[] = [];
  const today = new Date().toISOString().split('T')[0];

  // ── BATCH 1: Fetch all primary data in parallel ──
  const [
    userChildrenMap,
    { data: myProfile },
    { data: myRides },
    { data: pendingConvos },
    { data: joinedConvos },
    { data: pendingSentConvos },
    { data: receivedConvos },
    { data: privateRequests },
    { data: seriesSpaces },
  ] = await Promise.all([
    fetchChildrenForIds([userId]),
    supabase.from('profiles').select('car_make, car_model, car_color, license_plate, home_address').eq('id', userId).single(),
    supabase.from('rides').select('*').eq('user_id', userId),
    supabase.from('ride_conversations').select('id, ride_id, sender_id, message, created_at, status, selected_children').eq('recipient_id', userId).eq('status', 'pending'),
    supabase.from('ride_conversations').select('*, rides(*)').eq('sender_id', userId).eq('status', 'accepted'),
    supabase.from('ride_conversations').select('*, rides(*)').eq('sender_id', userId).eq('status', 'pending'),
    supabase.from('ride_conversations').select('*, rides(*)').eq('recipient_id', userId).eq('status', 'accepted'),
    supabase.from('private_ride_requests').select('*').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).in('status', ['accepted', 'pending']),
    supabase.from('series_spaces').select('id, parent_a_id, parent_b_id').or(`parent_a_id.eq.${userId},parent_b_id.eq.${userId}`),
  ]);

  const myChildren = userChildrenMap[userId] || [];
  const myProfileCarInfo = myProfile ? {
    carMake: myProfile.car_make || null,
    carModel: myProfile.car_model || null,
    carColor: myProfile.car_color || null,
    licensePlate: myProfile.license_plate || null,
  } : undefined;

  // ── Collect ALL other user IDs needed for profiles/children ──
  const otherUserIds = new Set<string>();

  if (pendingConvos) pendingConvos.forEach(c => otherUserIds.add(c.sender_id));
  if (joinedConvos) joinedConvos.forEach(c => { if (c.rides?.user_id) otherUserIds.add(c.rides.user_id); });
  if (pendingSentConvos) pendingSentConvos.forEach(c => { if (c.rides?.user_id) otherUserIds.add(c.rides.user_id); });
  if (receivedConvos) receivedConvos.forEach(c => otherUserIds.add(c.sender_id));
  if (privateRequests) privateRequests.forEach(r => {
    otherUserIds.add(r.sender_id === userId ? r.recipient_id : r.sender_id);
  });
  if (seriesSpaces) seriesSpaces.forEach(s => {
    const otherId = s.parent_a_id === userId ? s.parent_b_id : s.parent_a_id;
    otherUserIds.add(otherId);
  });
  otherUserIds.delete(userId);

  // ── BATCH 2: Fetch ALL other profiles and children in one go ──
  const allOtherIds = [...otherUserIds];
  const [allProfiles, allChildren] = await Promise.all([
    fetchProfilesForIds(allOtherIds),
    fetchChildrenForIds(allOtherIds),
  ]);

  // ── Process pending join requests ──
  const pendingByRide: Record<string, PendingJoinRequest[]> = {};
  if (pendingConvos && pendingConvos.length > 0) {
    for (const conv of pendingConvos) {
      const profile = allProfiles[conv.sender_id];
      const children = allChildren[conv.sender_id] || [];
      const name = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
        : 'Unknown';

      const req: PendingJoinRequest = {
        conversationId: conv.id,
        requesterId: conv.sender_id,
        requesterName: name,
        requesterEmail: profile?.email || null,
        requesterPhone: profile?.phone_number || null,
        children: filterChildrenBySelection(children, (conv as any).selected_children),
        message: conv.message,
        requestedAt: conv.created_at || '',
      };

      if (!pendingByRide[conv.ride_id]) pendingByRide[conv.ride_id] = [];
      pendingByRide[conv.ride_id].push(req);
    }
  }

  // ── 1. Own rides ──
  if (myRides) {
    for (const ride of myRides) {
      allRides.push({
        id: ride.id,
        source: 'posted',
        rideType: ride.type as 'request' | 'offer',
        status: ride.type === 'request' ? 'posted-looking' : 'posted-offering',
        rideStatus: (ride.status as UnifiedRide['rideStatus']) || 'active',
        pickupLocation: ride.pickup_location,
        dropoffLocation: ride.dropoff_location,
        rideDate: ride.ride_date,
        rideTime: ride.ride_time,
        seatsAvailable: ride.seats_available,
        seatsNeeded: ride.seats_needed,
        isDriver: ride.type === 'offer',
        otherParent: null,
        myChildren: filterChildrenBySelection(myChildren, (ride as any).selected_children),
        myCarInfo: extractCarInfo((ride as any).vehicle_info, myProfile),
        originalData: ride,
        pendingRequests: pendingByRide[ride.id] || [],
      });
    }
  }

  // ── 2. Joined rides (accepted) ──
  if (joinedConvos) {
    for (const conv of joinedConvos) {
      if (!conv.rides) continue;
      const ride = conv.rides;
      const isHelpingWithRequest = ride.type === 'request';
      const profile = allProfiles[ride.user_id];
      
      allRides.push({
        id: conv.id,
        source: 'conversation',
        rideType: ride.type as 'request' | 'offer',
        status: isHelpingWithRequest ? 'helping-out' : 'joined-ride',
        rideStatus: (ride.status as UnifiedRide['rideStatus']) || 'active',
        pickupLocation: ride.pickup_location,
        dropoffLocation: ride.dropoff_location,
        rideDate: ride.ride_date,
        rideTime: ride.ride_time,
        seatsAvailable: ride.seats_available,
        seatsNeeded: ride.seats_needed,
        isDriver: isHelpingWithRequest,
        otherParent: profile ? toParticipant(profile, filterChildrenBySelection(allChildren[ride.user_id] || [], (ride as any).selected_children)) : null,
        myChildren: filterChildrenBySelection(myChildren, (conv as any).selected_children),
        myCarInfo: extractCarInfo(null, myProfile),
        originalData: { conversation: conv, ride },
      });
    }
  }

  // ── 2b. Pending sent conversations ──
  if (pendingSentConvos) {
    for (const conv of pendingSentConvos) {
      if (!conv.rides) continue;
      const ride = conv.rides;
      const profile = allProfiles[ride.user_id];
      
      allRides.push({
        id: conv.id,
        source: 'conversation',
        rideType: ride.type as 'request' | 'offer',
        status: 'pending-approval',
        rideStatus: (ride.status as UnifiedRide['rideStatus']) || 'active',
        pickupLocation: ride.pickup_location,
        dropoffLocation: ride.dropoff_location,
        rideDate: ride.ride_date,
        rideTime: ride.ride_time,
        seatsAvailable: ride.seats_available,
        seatsNeeded: ride.seats_needed,
        isDriver: false,
        otherParent: profile ? toParticipant(profile, filterChildrenBySelection(allChildren[ride.user_id] || [], (ride as any).selected_children)) : null,
        myChildren: filterChildrenBySelection(myChildren, (conv as any).selected_children),
        myCarInfo: extractCarInfo(null, myProfile),
        originalData: { conversation: conv, ride },
      });
    }
  }

  // ── 2c. Received accepted conversations ──
  if (receivedConvos) {
    for (const conv of receivedConvos) {
      if (!conv.rides) continue;
      const ride = conv.rides;

      const existingIdx = allRides.findIndex(r => r.source === 'posted' && r.id === ride.id);
      const joiner = allProfiles[conv.sender_id];
      const participant = joiner ? toParticipant(joiner, filterChildrenBySelection(allChildren[conv.sender_id] || [], (conv as any).selected_children)) : null;

      if (existingIdx !== -1) {
        allRides[existingIdx].status = ride.type === 'request' ? 'helping-out' : 'joined-ride';
        allRides[existingIdx].otherParent = participant;
      } else {
        allRides.push({
          id: conv.id,
          source: 'conversation',
          rideType: ride.type as 'request' | 'offer',
          status: ride.type === 'request' ? 'helping-out' : 'joined-ride',
          rideStatus: (ride.status as UnifiedRide['rideStatus']) || 'active',
          pickupLocation: ride.pickup_location,
          dropoffLocation: ride.dropoff_location,
          rideDate: ride.ride_date,
          rideTime: ride.ride_time,
          seatsAvailable: ride.seats_available,
          seatsNeeded: ride.seats_needed,
          isDriver: ride.type === 'offer',
          otherParent: participant,
          myChildren: filterChildrenBySelection(myChildren, (ride as any).selected_children),
          myCarInfo: extractCarInfo(null, myProfile),
          originalData: { conversation: conv, ride },
        });
      }
    }
  }

  // ── 3. Private ride requests ──
  if (privateRequests) {
    for (const req of privateRequests) {
      const isSender = req.sender_id === userId;
      const otherId = isSender ? req.recipient_id : req.sender_id;
      
      let status: UnifiedRide['status'];
      let isDriver: boolean;
      
      if (req.status === 'pending') {
        status = isSender ? 'pending-direct-sent' : 'pending-direct-received';
        isDriver = req.request_type === 'offer' ? isSender : !isSender;
      } else {
        if (isSender) {
          status = req.request_type === 'request' ? 'joined-ride' : 'helping-out';
          isDriver = req.request_type !== 'request';
        } else {
          status = req.request_type === 'request' ? 'helping-out' : 'joined-ride';
          isDriver = req.request_type === 'request';
        }
      }

      const isPast = req.ride_date < today;
      const profile = allProfiles[otherId];

      const senderChildIds = (req as any).selected_children as string[] | null;
      const recipientChildIds = (req as any).recipient_selected_children as string[] | null;
      const mySelectedIds = isSender ? senderChildIds : recipientChildIds;
      const otherSelectedIds = isSender ? recipientChildIds : senderChildIds;

      const filteredMyChildren = filterChildrenBySelection(myChildren, mySelectedIds);
      const otherKids = allChildren[otherId] || [];
      const filteredOtherKids = req.status === 'accepted' && otherSelectedIds
        ? filterChildrenBySelection(otherKids, otherSelectedIds)
        : [];

      allRides.push({
        id: req.id,
        source: 'private',
        rideType: req.request_type,
        status,
        rideStatus: isPast ? 'completed' : 'active',
        pickupLocation: req.pickup_address,
        dropoffLocation: req.dropoff_address,
        rideDate: req.ride_date,
        rideTime: req.pickup_time,
        seatsAvailable: req.seats_offered,
        seatsNeeded: req.seats_needed,
        isDriver,
        otherParent: profile ? toParticipant(profile, filteredOtherKids) : null,
        myChildren: filteredMyChildren,
        myCarInfo: extractCarInfo((req as any).vehicle_info, myProfile),
        originalData: req,
      });
    }
  }

  // ── 4. Series recurring ride occurrences ──
  if (seriesSpaces && seriesSpaces.length > 0) {
    const spaceIds = seriesSpaces.map(s => s.id);
    const [{ data: schedules }, { data: cancellations }] = await Promise.all([
      supabase.from('recurring_schedules').select('*').in('space_id', spaceIds).eq('status', 'accepted'),
      supabase.from('schedule_cancellations').select('*').in('schedule_id', 
        // We'll filter after
        spaceIds // placeholder, will re-filter
      ),
    ]);

    // Fetch actual cancellations for found schedules
    const scheduleIds = schedules?.map(s => s.id) || [];
    let actualCancellations: any[] = [];
    if (scheduleIds.length > 0) {
      const { data } = await supabase.from('schedule_cancellations').select('*').in('schedule_id', scheduleIds);
      actualCancellations = data || [];
    }

    const cancelledSet = new Set(
      actualCancellations.map((c: any) => `${c.schedule_id}-${c.cancelled_date}-${c.cancelled_day}`)
    );

    if (schedules) {
      for (const schedule of schedules) {
        const space = seriesSpaces.find(s => s.id === schedule.space_id);
        if (!space) continue;

        const otherId = space.parent_a_id === userId ? space.parent_b_id : space.parent_a_id;
        const otherProfile = allProfiles[otherId];
        const assignments = (schedule.day_assignments as any[]) || [];
        const days = assignments.map((a: any) => a.day);

        // Generate occurrences for next 4 weeks
        const occurrences = getNextOccurrences(days, 4);

        // Get children names
        const proposerKids = filterChildrenBySelection(
          schedule.proposer_id === userId ? myChildren : (allChildren[otherId] || []),
          schedule.proposer_children as string[] | null
        );
        const recipientKids = filterChildrenBySelection(
          schedule.recipient_id === userId ? myChildren : (allChildren[otherId] || []),
          schedule.recipient_children as string[] | null
        );
        const allKids = [...proposerKids, ...recipientKids].filter(
          (k, i, arr) => i === arr.findIndex(x => x.name === k.name)
        );

        for (const occ of occurrences) {
          const cancelKey = `${schedule.id}-${occ.date}-${occ.day}`;
          if (cancelledSet.has(cancelKey)) continue;

          const assignment = assignments.find((a: any) => a.day === occ.day);
          if (!assignment) continue;

          const driverId = assignment.driver_id;
          const isUserDriver = driverId === userId;
          const isWed = occ.day === 'Wed';

          // Get the pickup time for this day
          let pickupTime: string | null = null;
          if (driverId === schedule.proposer_id) {
            pickupTime = isWed ? schedule.proposer_wednesday_time : schedule.proposer_regular_time;
          } else {
            pickupTime = isWed ? schedule.recipient_wednesday_time : schedule.recipient_regular_time;
          }
          if (!pickupTime) pickupTime = '08:00';

          // Get driver's address and vehicle
          const driverProfile = driverId === userId ? { ...myProfile, id: userId } : otherProfile;
          const driverVehicle = driverId === schedule.proposer_id
            ? schedule.proposer_vehicle
            : schedule.recipient_vehicle;

          const pickupAddress = driverProfile?.home_address || 'Home address';

          // Fetch driver's primary vehicle from DB if vehicle snapshot is missing
          let resolvedDriverVehicle = driverVehicle;
          if (!resolvedDriverVehicle || (typeof resolvedDriverVehicle === 'object' && resolvedDriverVehicle !== null && !Array.isArray(resolvedDriverVehicle) && !(resolvedDriverVehicle as any).car_make)) {
            const { data: driverVehicles } = await supabase
              .from('vehicles')
              .select('car_make, car_model, car_color, license_plate')
              .eq('user_id', driverId)
              .eq('is_primary', true)
              .limit(1);
            if (driverVehicles && driverVehicles.length > 0) {
              resolvedDriverVehicle = driverVehicles[0];
            }
          }

          const otherParentInfo = otherProfile ? {
            id: otherProfile.id,
            firstName: otherProfile.first_name,
            lastName: otherProfile.last_name,
            username: otherProfile.username,
            email: null,
            phone: otherProfile.phone_number || null,
            children: [],
            carMake: otherProfile.car_make || null,
            carModel: otherProfile.car_model || null,
            carColor: otherProfile.car_color || null,
            licensePlate: otherProfile.license_plate || null,
          } as ParticipantInfo : null;

          allRides.push({
            id: `series-${schedule.id}-${occ.date}-${occ.day}`,
            source: 'series' as any,
            rideType: 'offer',
            status: 'confirmed',
            rideStatus: 'active',
            pickupLocation: pickupAddress,
            dropoffLocation: 'Chadwick School — 26800 S Academy Dr, Palos Verdes Peninsula, CA 90274',
            rideDate: occ.date,
            rideTime: pickupTime,
            seatsAvailable: null,
            seatsNeeded: null,
            isDriver: isUserDriver,
            otherParent: otherParentInfo,
            myChildren: allKids,
            myCarInfo: resolvedDriverVehicle ? extractCarInfo(resolvedDriverVehicle) : myProfileCarInfo,
            originalData: {
              _seriesRide: true,
              scheduleId: schedule.id,
              spaceId: schedule.space_id,
              day: occ.day,
              date: occ.date,
              driverId,
              otherParentId: otherId,
            },
          });
        }
      }
    }
  }

  // Sort by date
  allRides.sort((a, b) => {
    const dateA = new Date(`${a.rideDate}T${a.rideTime}`);
    const dateB = new Date(`${b.rideDate}T${b.rideTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  const active = allRides.filter(r => r.rideStatus === 'active' && r.rideDate >= today);
  const past = allRides.filter(r => r.rideStatus !== 'active' || r.rideDate < today).reverse();

  return { active, past };
}
