import { supabase } from "@/integrations/supabase/client";
import type { UnifiedRide } from "@/components/UnifiedRideCard";

interface FetchResult {
  active: UnifiedRide[];
  past: UnifiedRide[];
}

async function fetchProfilesForIds(ids: string[]): Promise<Record<string, any>> {
  if (ids.length === 0) return {};
  
  const [{ data: profiles }, { data: users }] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, username, phone_number, share_phone, share_email').in('id', ids),
    supabase.from('users').select('user_id, email').in('user_id', ids),
  ]);

  if (!profiles) return {};
  return profiles.reduce((acc, p) => {
    const email = users?.find(u => u.user_id === p.id)?.email;
    acc[p.id] = { ...p, email };
    return acc;
  }, {} as Record<string, any>);
}

function toOtherParent(p: any) {
  if (!p) return null;
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    username: p.username,
    email: p.share_email ? p.email : null,
    phone: p.share_phone ? p.phone_number : null,
  };
}

export async function fetchUnifiedRides(userId: string): Promise<FetchResult> {
  const allRides: UnifiedRide[] = [];
  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch ALL user's own rides (active + past)
  const { data: myRides } = await supabase
    .from('rides')
    .select('*')
    .eq('user_id', userId);

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
        originalData: ride,
      });
    }
  }

  // 2. Fetch conversations where user joined someone's ride
  const { data: joinedConvos } = await supabase
    .from('ride_conversations')
    .select('*, rides(*)')
    .eq('sender_id', userId)
    .eq('status', 'accepted');

  if (joinedConvos) {
    const ownerIds = [...new Set(joinedConvos.map(c => c.rides?.user_id).filter(Boolean))] as string[];
    const ownerProfiles = await fetchProfilesForIds(ownerIds);

    for (const conv of joinedConvos) {
      if (!conv.rides) continue;
      const ride = conv.rides;
      const isHelpingWithRequest = ride.type === 'request';
      
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
        otherParent: toOtherParent(ownerProfiles[ride.user_id]),
        originalData: { conversation: conv, ride },
      });
    }
  }

  // 2b. Conversations where someone joined the user's ride
  const { data: receivedConvos } = await supabase
    .from('ride_conversations')
    .select('*, rides(*)')
    .eq('recipient_id', userId)
    .eq('status', 'accepted');

  if (receivedConvos) {
    const joinerIds = [...new Set(receivedConvos.map(c => c.sender_id).filter(Boolean))] as string[];
    const joinerProfiles = await fetchProfilesForIds(joinerIds);

    for (const conv of receivedConvos) {
      if (!conv.rides) continue;
      const ride = conv.rides;

      const existingIdx = allRides.findIndex(r => r.source === 'posted' && r.id === ride.id);
      const joiner = joinerProfiles[conv.sender_id];

      if (existingIdx !== -1) {
        allRides[existingIdx].status = ride.type === 'request' ? 'helping-out' : 'joined-ride';
        allRides[existingIdx].otherParent = toOtherParent(joiner);
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
          otherParent: toOtherParent(joiner),
          originalData: { conversation: conv, ride },
        });
      }
    }
  }

  // 3. Private ride requests (accepted)
  const { data: privateRequests } = await supabase
    .from('private_ride_requests')
    .select('*')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (privateRequests) {
    const otherIds = [...new Set(privateRequests.map(r => r.sender_id === userId ? r.recipient_id : r.sender_id))];
    const otherProfiles = await fetchProfilesForIds(otherIds);

    for (const req of privateRequests) {
      const isSender = req.sender_id === userId;
      const otherId = isSender ? req.recipient_id : req.sender_id;
      
      let status: UnifiedRide['status'];
      let isDriver: boolean;
      
      if (isSender) {
        status = req.request_type === 'request' ? 'joined-ride' : 'helping-out';
        isDriver = req.request_type !== 'request';
      } else {
        status = req.request_type === 'request' ? 'helping-out' : 'joined-ride';
        isDriver = req.request_type === 'request';
      }

      const isPast = req.ride_date < today;

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
        otherParent: toOtherParent(otherProfiles[otherId]),
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
