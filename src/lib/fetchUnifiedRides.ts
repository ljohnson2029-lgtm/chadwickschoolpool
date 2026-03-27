import { supabase } from "@/integrations/supabase/client";
import type { UnifiedRide, ParticipantInfo, PendingJoinRequest } from "@/components/UnifiedRideCard";

interface FetchResult {
  active: UnifiedRide[];
  past: UnifiedRide[];
}

async function fetchProfilesForIds(ids: string[]): Promise<Record<string, any>> {
  if (ids.length === 0) return {};
  
  const [{ data: profiles }, { data: users }] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, username, phone_number, share_phone, share_email, car_make, car_model, car_color, license_plate').in('id', ids),
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
    phone: p.share_phone ? p.phone_number : null,
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

export async function fetchUnifiedRides(userId: string): Promise<FetchResult> {
  const allRides: UnifiedRide[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Fetch current user's children and car info
  const [userChildrenMap, { data: myProfile }] = await Promise.all([
    fetchChildrenForIds([userId]),
    supabase.from('profiles').select('car_make, car_model, car_color, license_plate').eq('id', userId).single(),
  ]);
  const myChildren = userChildrenMap[userId] || [];
  const myProfileCarInfo = myProfile ? {
    carMake: myProfile.car_make || null,
    carModel: myProfile.car_model || null,
    carColor: myProfile.car_color || null,
    licensePlate: myProfile.license_plate || null,
  } : undefined;

  // 1. Fetch ALL user's own rides (active + past)
  const { data: myRides } = await supabase
    .from('rides')
    .select('*')
    .eq('user_id', userId);

  // 1b. Fetch pending join requests for user's own rides
  const { data: pendingConvos } = await supabase
    .from('ride_conversations')
    .select('id, ride_id, sender_id, message, created_at, status, selected_children')
    .eq('recipient_id', userId)
    .eq('status', 'pending');

  // Build pending requests map: ride_id -> PendingJoinRequest[]
  const pendingByRide: Record<string, PendingJoinRequest[]> = {};
  if (pendingConvos && pendingConvos.length > 0) {
    const requesterIds = [...new Set(pendingConvos.map(c => c.sender_id))];
    const [requesterProfiles, requesterChildren] = await Promise.all([
      fetchProfilesForIds(requesterIds),
      fetchChildrenForIds(requesterIds),
    ]);

    console.log('[fetchUnifiedRides] Pending join requests debug:');
    console.log('  Requester IDs:', requesterIds);
    console.log('  Profiles fetched:', Object.keys(requesterProfiles));
    console.log('  Children fetched:', Object.entries(requesterChildren).map(([id, kids]) => ({ id, childCount: (kids as any[]).length, children: kids })));

    for (const conv of pendingConvos) {
      const profile = requesterProfiles[conv.sender_id];
      const children = requesterChildren[conv.sender_id] || [];
      const name = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username
        : 'Unknown';

      console.log(`  Request from ${name} (${conv.sender_id}): profile=${!!profile}, children=${children.length}`, { profile, children });

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
        myCarInfo,
        originalData: ride,
        pendingRequests: pendingByRide[ride.id] || [],
      });
    }
  }

  // 2. Fetch conversations where user joined someone's ride (accepted)
  const { data: joinedConvos } = await supabase
    .from('ride_conversations')
    .select('*, rides(*)')
    .eq('sender_id', userId)
    .eq('status', 'accepted');

  if (joinedConvos) {
    const ownerIds = [...new Set(joinedConvos.map(c => c.rides?.user_id).filter(Boolean))] as string[];
    const [ownerProfiles, ownerChildren] = await Promise.all([
      fetchProfilesForIds(ownerIds),
      fetchChildrenForIds(ownerIds),
    ]);

    for (const conv of joinedConvos) {
      if (!conv.rides) continue;
      const ride = conv.rides;
      const isHelpingWithRequest = ride.type === 'request';
      const profile = ownerProfiles[ride.user_id];
      
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
        otherParent: profile ? toParticipant(profile, filterChildrenBySelection(ownerChildren[ride.user_id] || [], (ride as any).selected_children)) : null,
        myChildren: filterChildrenBySelection(myChildren, (conv as any).selected_children),
        myCarInfo,
        originalData: { conversation: conv, ride },
      });
    }
  }

  // 2b. Fetch PENDING conversations where user requested to join (awaiting approval)
  const { data: pendingSentConvos } = await supabase
    .from('ride_conversations')
    .select('*, rides(*)')
    .eq('sender_id', userId)
    .eq('status', 'pending');

  if (pendingSentConvos) {
    const ownerIds = [...new Set(pendingSentConvos.map(c => c.rides?.user_id).filter(Boolean))] as string[];
    const [ownerProfiles, ownerChildren] = await Promise.all([
      fetchProfilesForIds(ownerIds),
      fetchChildrenForIds(ownerIds),
    ]);

    for (const conv of pendingSentConvos) {
      if (!conv.rides) continue;
      const ride = conv.rides;
      const profile = ownerProfiles[ride.user_id];
      
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
        otherParent: profile ? toParticipant(profile, filterChildrenBySelection(ownerChildren[ride.user_id] || [], (ride as any).selected_children)) : null,
        myChildren: filterChildrenBySelection(myChildren, (conv as any).selected_children),
        myCarInfo,
        originalData: { conversation: conv, ride },
      });
    }
  }

  // 2c. Conversations where someone joined the user's ride (accepted)
  const { data: receivedConvos } = await supabase
    .from('ride_conversations')
    .select('*, rides(*)')
    .eq('recipient_id', userId)
    .eq('status', 'accepted');

  if (receivedConvos) {
    const joinerIds = [...new Set(receivedConvos.map(c => c.sender_id).filter(Boolean))] as string[];
    const [joinerProfiles, joinerChildren] = await Promise.all([
      fetchProfilesForIds(joinerIds),
      fetchChildrenForIds(joinerIds),
    ]);

    for (const conv of receivedConvos) {
      if (!conv.rides) continue;
      const ride = conv.rides;

      const existingIdx = allRides.findIndex(r => r.source === 'posted' && r.id === ride.id);
      const joiner = joinerProfiles[conv.sender_id];
      const participant = joiner ? toParticipant(joiner, filterChildrenBySelection(joinerChildren[conv.sender_id] || [], (conv as any).selected_children)) : null;

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
        myCarInfo,
          originalData: { conversation: conv, ride },
        });
      }
    }
  }

  // 3. Private ride requests (accepted AND pending)
  const { data: privateRequests } = await supabase
    .from('private_ride_requests')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .in('status', ['accepted', 'pending']);

  if (privateRequests) {
    const otherIds = [...new Set(privateRequests.map(r => r.sender_id === userId ? r.recipient_id : r.sender_id))];
    const [otherProfiles, otherChildren] = await Promise.all([
      fetchProfilesForIds(otherIds),
      fetchChildrenForIds(otherIds),
    ]);

    for (const req of privateRequests) {
      const isSender = req.sender_id === userId;
      const otherId = isSender ? req.recipient_id : req.sender_id;
      
      let status: UnifiedRide['status'];
      let isDriver: boolean;
      
      if (req.status === 'pending') {
        status = isSender ? 'pending-direct-sent' : 'pending-direct-received';
        isDriver = req.request_type === 'offer' ? isSender : !isSender;
      } else {
        // Accepted
        if (isSender) {
          status = req.request_type === 'request' ? 'joined-ride' : 'helping-out';
          isDriver = req.request_type !== 'request';
        } else {
          status = req.request_type === 'request' ? 'helping-out' : 'joined-ride';
          isDriver = req.request_type === 'request';
        }
      }

      const isPast = req.ride_date < today;
      const profile = otherProfiles[otherId];

      // Filter children by per-trip selections
      const senderChildIds = (req as any).selected_children as string[] | null;
      const recipientChildIds = (req as any).recipient_selected_children as string[] | null;
      const mySelectedIds = isSender ? senderChildIds : recipientChildIds;
      const otherSelectedIds = isSender ? recipientChildIds : senderChildIds;

      const filteredMyChildren = filterChildrenBySelection(myChildren, mySelectedIds);
      const otherKids = otherChildren[otherId] || [];
      // Only show the other party's children if the ride has been accepted
      // and they have actually selected their children
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
        myCarInfo,
        originalData: req,
      });
    }
  }

  // Sort by date (soonest first for active, most recent first for past)
  allRides.sort((a, b) => {
    const dateA = new Date(`${a.rideDate}T${a.rideTime}`);
    const dateB = new Date(`${b.rideDate}T${b.rideTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  const active = allRides.filter(r => r.rideStatus === 'active' && r.rideDate >= today);
  const past = allRides.filter(r => r.rideStatus !== 'active' || r.rideDate < today).reverse();

  return { active, past };
}
