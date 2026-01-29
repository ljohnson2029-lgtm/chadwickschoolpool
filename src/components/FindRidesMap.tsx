import React, { useEffect, useState, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import RideUserBadge from "@/components/RideUserBadge";
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, MapPin, Users, Car, Hand, X, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { isParent as checkIsParent, isStudent as checkIsStudent } from '@/lib/permissions';
import { JoinRideDialog, OfferRideDialog } from './ConfirmDialogs';

interface Ride {
  id: string;
  type: 'request' | 'offer';
  pickup_location: string;
  dropoff_location: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  ride_date: string;
  ride_time: string;
  seats_needed: number | null;
  seats_available: number | null;
  route_details: string | null;
  user_id: string;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string;
    phone_number?: string | null;
    share_phone?: boolean | null;
    share_email?: boolean | null;
  };
  userEmail?: string;
}

interface RideResponse {
  ride_id: string;
  status: string;
}

// Chadwick School coordinates (verified)
const CHADWICK_SCHOOL = {
  name: 'Chadwick School',
  address: '26800 S Academy Dr, Palos Verdes Peninsula, CA 90274',
  lat: 33.77667,
  lng: -118.36111
};

interface FindRidesMapProps {
  height?: string;
  showRequests: boolean;
  showOffers: boolean;
  onToggleRequests: (value: boolean) => void;
  onToggleOffers: (value: boolean) => void;
  focusRide?: {
    id: string;
    pickup_latitude: number | null;
    pickup_longitude: number | null;
    pickup_location: string;
  } | null;
  onFocusRideHandled?: () => void;
}


const FindRidesMap: React.FC<FindRidesMapProps> = ({
  height = '500px',
  showRequests,
  showOffers,
  onToggleRequests,
  onToggleOffers,
  focusRide,
  onFocusRideHandled
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [rides, setRides] = useState<Ride[]>([]);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isUserParent, setIsUserParent] = useState(false);
  const [isUserStudent, setIsUserStudent] = useState(false);
  
  // Track user's existing responses to rides
  const [userResponses, setUserResponses] = useState<RideResponse[]>([]);
  const [respondingToRide, setRespondingToRide] = useState<Ride | null>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch user email and determine role
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', user.id)
        .single();
      
      if (data?.email) {
        setUserEmail(data.email);
        setIsUserParent(checkIsParent(data.email));
        setIsUserStudent(checkIsStudent(data.email));
      }
    };
    fetchUserInfo();
  }, [user]);

  // Fetch user's existing ride responses
  const fetchUserResponses = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('ride_conversations')
      .select('ride_id, status')
      .eq('sender_id', user.id);
    
    if (error) {
      console.error('Error fetching user responses:', error);
    } else {
      setUserResponses(data || []);
    }
  }, [user]);

  useEffect(() => {
    fetchUserResponses();
  }, [fetchUserResponses]);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      if (error) {
        console.error('Error fetching Mapbox token:', error);
      } else if (data?.token) {
        setMapboxToken(data.token);
      }
    };
    fetchToken();
  }, []);

  // Fetch rides data
  useEffect(() => {
    const fetchRides = async () => {
      if (!user) return;

      // Fetch ALL active rides (no date filter - show all for debugging)
      const { data: ridesData, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('[FindRidesMap] Error fetching rides:', error);
        return;
      }

      console.log('[FindRidesMap] Raw rides from DB:', ridesData?.length || 0, ridesData);

      // Filter to show only rides with valid coordinates OR valid addresses
      const ridesWithLocation = (ridesData || []).filter(ride => {
        const hasPickupCoords = ride.pickup_latitude != null && ride.pickup_longitude != null;
        const hasPickupAddress = ride.pickup_location && ride.pickup_location.trim() !== '';
        const isValid = hasPickupCoords || hasPickupAddress;
        
        if (!isValid) {
          console.log('[FindRidesMap] Filtering out ride (no location):', ride.id, ride);
        }
        
        return isValid;
      });

      console.log('[FindRidesMap] Rides with valid location:', ridesWithLocation.length);

      // Get unique user IDs and fetch profiles
      const userIds = [...new Set(ridesWithLocation.map(r => r.user_id) || [])];
      let profilesMap: Record<string, any> = {};
      let emailsMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, phone_number, share_phone, share_email')
          .in('id', userIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }

        // Fetch emails for users who share them
        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, email')
          .in('user_id', userIds);
        
        if (usersData) {
          emailsMap = usersData.reduce((acc, u) => {
            acc[u.user_id] = u.email;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const combinedData = ridesWithLocation.map(ride => ({
        ...ride,
        profile: profilesMap[ride.user_id] || null,
        userEmail: emailsMap[ride.user_id] || null
      }));

      console.log('[FindRidesMap] Final combined rides:', combinedData.length);
      setRides(combinedData as Ride[]);
    };

    fetchRides();
  }, [user]);

  // Geocode address
  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address }
      });

      if (error || !data?.coordinates) {
        return null;
      }

      return [data.coordinates.longitude, data.coordinates.latitude];
    } catch (err) {
      return null;
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !profile) return;

    mapboxgl.accessToken = mapboxToken;

    const userLat = (profile as any)?.home_latitude;
    const userLng = (profile as any)?.home_longitude;
    const centerCoord: [number, number] = userLat && userLng 
      ? [userLng, userLat] 
      : [-118.3964, 33.7447]; // Default to Chadwick area

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: centerCoord,
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl({ unit: 'imperial' }), 'bottom-left');

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [mapboxToken, profile]);

  // Add markers
  useEffect(() => {
    if (!map.current || !mapboxToken) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const addMarkers = async () => {
      const bounds = new mapboxgl.LngLatBounds();
      let hasValidMarkers = false;

      // Add user's home marker (blue)
      const userLat = profile?.home_latitude;
      const userLng = profile?.home_longitude;

      if (profile?.home_address && userLat && userLng) {
        const el = document.createElement('div');
        el.className = 'flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full shadow-lg border-2 border-white cursor-pointer';
        el.innerHTML = '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>';

        // Create popup content safely using DOM methods to prevent XSS
        const popupDiv = document.createElement('div');
        popupDiv.className = 'p-2';
        
        const title = document.createElement('p');
        title.className = 'font-semibold text-blue-600';
        title.textContent = 'Your Home';
        
        const address = document.createElement('p');
        address.className = 'text-sm text-gray-600';
        address.textContent = profile.home_address; // Safe - uses textContent
        
        popupDiv.appendChild(title);
        popupDiv.appendChild(address);
        
        const popup = new mapboxgl.Popup({ offset: 25 });
        popup.setDOMContent(popupDiv);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([userLng, userLat])
          .setPopup(popup)
          .addTo(map.current!);
        
        markersRef.current.push(marker);
        bounds.extend([userLng, userLat]);
        hasValidMarkers = true;
      }

      // Add Chadwick School marker (orange)
      const schoolEl = document.createElement('div');
      schoolEl.className = 'flex items-center justify-center w-9 h-9 bg-orange-500 rounded-full shadow-lg border-2 border-white cursor-pointer';
      schoolEl.innerHTML = '<svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>';

      const schoolPopupDiv = document.createElement('div');
      schoolPopupDiv.className = 'p-2';
      
      const schoolTitle = document.createElement('p');
      schoolTitle.className = 'font-semibold text-orange-600';
      schoolTitle.textContent = CHADWICK_SCHOOL.name;
      
      const schoolAddress = document.createElement('p');
      schoolAddress.className = 'text-sm text-gray-600';
      schoolAddress.textContent = CHADWICK_SCHOOL.address;
      
      schoolPopupDiv.appendChild(schoolTitle);
      schoolPopupDiv.appendChild(schoolAddress);
      
      const schoolPopup = new mapboxgl.Popup({ offset: 25 });
      schoolPopup.setDOMContent(schoolPopupDiv);

      const schoolMarker = new mapboxgl.Marker(schoolEl)
        .setLngLat([CHADWICK_SCHOOL.lng, CHADWICK_SCHOOL.lat])
        .setPopup(schoolPopup)
        .addTo(map.current!);
      
      markersRef.current.push(schoolMarker);
      bounds.extend([CHADWICK_SCHOOL.lng, CHADWICK_SCHOOL.lat]);
      hasValidMarkers = true;

      // Add ride markers
      const filteredRides = rides.filter(r => 
        (showRequests && r.type === 'request') || (showOffers && r.type === 'offer')
      );

      console.log('[FindRidesMap] Filtering rides - showRequests:', showRequests, 'showOffers:', showOffers);
      console.log('[FindRidesMap] Filtered rides count:', filteredRides.length);

      for (const ride of filteredRides) {
        console.log('[FindRidesMap] Processing ride:', ride.id, 'type:', ride.type, 
          'coords:', ride.pickup_latitude, ride.pickup_longitude);

        // Use stored coordinates if available, otherwise geocode
        let pickupCoord: [number, number] | null = null;
        if (ride.pickup_latitude && ride.pickup_longitude) {
          pickupCoord = [ride.pickup_longitude, ride.pickup_latitude];
        } else if (ride.pickup_location) {
          console.log('[FindRidesMap] Geocoding pickup for ride:', ride.id);
          pickupCoord = await geocodeAddress(ride.pickup_location);
        }
        
        if (pickupCoord) {
          console.log('[FindRidesMap] Adding pickup marker for ride:', ride.id, 'at:', pickupCoord);
          
          const isRequest = ride.type === 'request';
          const color = isRequest ? '#ef4444' : '#22c55e'; // Red for requests, Green for offers
          
          const el = document.createElement('div');
          el.className = `flex items-center justify-center w-7 h-7 rounded-full shadow-lg border-2 border-white cursor-pointer`;
          el.style.backgroundColor = color;
          el.innerHTML = isRequest 
            ? '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path></svg>'
            : '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"></path></svg>';

          el.addEventListener('click', () => {
            setSelectedRide(ride);
          });

          const marker = new mapboxgl.Marker(el)
            .setLngLat(pickupCoord)
            .addTo(map.current!);
          
          markersRef.current.push(marker);
          bounds.extend(pickupCoord);
          hasValidMarkers = true;
        } else {
          console.log('[FindRidesMap] Failed to get pickup coords for ride:', ride.id);
        }

        // Add dropoff marker with different style
        let dropoffCoord: [number, number] | null = null;
        if (ride.dropoff_latitude && ride.dropoff_longitude) {
          dropoffCoord = [ride.dropoff_longitude, ride.dropoff_latitude];
        } else if (ride.dropoff_location) {
          dropoffCoord = await geocodeAddress(ride.dropoff_location);
        }

        if (dropoffCoord) {
          const isRequest = ride.type === 'request';
          const color = isRequest ? '#fca5a5' : '#86efac'; // Lighter version
          
          const el = document.createElement('div');
          el.className = `flex items-center justify-center w-5 h-5 rounded-full shadow border-2 border-white cursor-pointer`;
          el.style.backgroundColor = color;
          el.innerHTML = '<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>';

          el.addEventListener('click', () => {
            setSelectedRide(ride);
          });

          const marker = new mapboxgl.Marker(el)
            .setLngLat(dropoffCoord)
            .addTo(map.current!);
          
          markersRef.current.push(marker);
          bounds.extend(dropoffCoord);
          hasValidMarkers = true;
        }
      }

      // Fit map to show all markers
      if (hasValidMarkers && map.current && !bounds.isEmpty()) {
        console.log('[FindRidesMap] Fitting bounds to show all markers');
        map.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 100, right: 100 },
          maxZoom: 14,
          duration: 1000
        });
      }

      console.log('[FindRidesMap] Total markers added:', markersRef.current.length);
    };

    addMarkers();
  }, [rides, showRequests, showOffers, profile, mapboxToken]);

  // Handle focus on a specific ride from list view
  useEffect(() => {
    if (!focusRide || !map.current) return;

    const focusOnRide = async () => {
      // Find the ride in our rides array
      const ride = rides.find(r => r.id === focusRide.id);
      if (ride) {
        setSelectedRide(ride);
      }

      // Get coordinates to center on
      let coords: [number, number] | null = null;
      if (focusRide.pickup_latitude && focusRide.pickup_longitude) {
        coords = [focusRide.pickup_longitude, focusRide.pickup_latitude];
      } else if (focusRide.pickup_location) {
        coords = await geocodeAddress(focusRide.pickup_location);
      }

      if (coords && map.current) {
        map.current.flyTo({
          center: coords,
          zoom: 14,
          duration: 1500
        });
      }

      // Clear the focus after handling
      onFocusRideHandled?.();
    };

    focusOnRide();
  }, [focusRide, rides, onFocusRideHandled]);

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (username && username.trim()) {
      return username.substring(0, 2).toUpperCase();
    }
    return 'NA';
  };

  // Get display name with proper fallbacks - never show "Unknown"
  const getDisplayName = (ride: Ride): string => {
    if (ride.profile?.first_name && ride.profile?.last_name) {
      return `${ride.profile.first_name} ${ride.profile.last_name}`;
    }
    if (ride.profile?.first_name) {
      return ride.profile.first_name;
    }
    if (ride.profile?.username && ride.profile.username.trim()) {
      return ride.profile.username;
    }
    // Fallback to email if available
    if (ride.userEmail) {
      return ride.userEmail.split('@')[0]; // Show email prefix
    }
    return 'Parent';
  };

  // Get user's response status for a ride
  const getUserResponseStatus = (rideId: string): string | null => {
    const response = userResponses.find(r => r.ride_id === rideId);
    return response?.status || null;
  };

  // Initiate response flow with confirmation dialog
  const initiateRespondToRide = (ride: Ride) => {
    setRespondingToRide(ride);
    if (ride.type === 'offer') {
      setShowJoinDialog(true);
    } else {
      setShowOfferDialog(true);
    }
  };

  // Handle the actual response after confirmation
  const handleConfirmResponse = async () => {
    if (!user || !respondingToRide) return;
    setActionLoading(true);

    const ownerName = respondingToRide.profile?.first_name 
      ? `${respondingToRide.profile.first_name} ${respondingToRide.profile.last_name || ''}`.trim()
      : respondingToRide.profile?.username || 'the ride owner';

    try {
      const { error } = await supabase
        .from('ride_conversations')
        .insert({
          ride_id: respondingToRide.id,
          sender_id: user.id,
          recipient_id: respondingToRide.user_id,
          status: 'pending',
          message: respondingToRide.type === 'request' 
            ? `I can help with your ride request!`
            : `I'd like to join your offered ride!`
        });

      if (error) {
        console.error('Error responding to ride:', error);
        toast({
          title: "Error",
          description: "Failed to send your request. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Send notification to ride owner
      try {
        await supabase.functions.invoke('create-notification', {
          body: {
            userId: respondingToRide.user_id,
            type: respondingToRide.type === 'request' ? 'ride_offer_received' : 'ride_join_request',
            message: respondingToRide.type === 'request'
              ? `${profile?.first_name || 'Someone'} offered to help with your ride request`
              : `${profile?.first_name || 'Someone'} wants to join your ride`
          }
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }
      
      toast({
        title: respondingToRide.type === 'request' ? "Offer Sent!" : "Request Sent!",
        description: respondingToRide.type === 'request'
          ? `Your ride offer was sent to ${ownerName}! They'll be notified and can accept or decline.`
          : `Your join request was sent to ${ownerName}! They'll be notified and can approve or decline.`,
      });

      // Refresh user responses to update button state
      await fetchUserResponses();
      setSelectedRide(null);
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
      setShowJoinDialog(false);
      setShowOfferDialog(false);
      setRespondingToRide(null);
    }
  };

  if (!mapboxToken) {
    return (
      <div 
        className="w-full bg-muted rounded-lg flex items-center justify-center border border-border" 
        style={{ height }}
      >
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {/* Legend */}
      <Card className="absolute top-4 left-4 p-3 bg-background/95 backdrop-blur-sm">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
            <span>Your Home</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow" />
            <span>Chadwick School</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
            <span>Ride Requests</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
            <span>Ride Offers</span>
          </div>
        </div>
      </Card>


      {/* Selected Ride Panel */}
      {selectedRide && (
        <Card className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-background/95 backdrop-blur-sm shadow-xl z-50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <RideUserBadge
                  userId={selectedRide.user_id}
                  firstName={selectedRide.profile?.first_name || null}
                  lastName={selectedRide.profile?.last_name || null}
                  username={getDisplayName(selectedRide)}
                  accountType="parent"
                  email={selectedRide.userEmail}
                  phoneNumber={selectedRide.profile?.phone_number}
                  shareEmail={selectedRide.profile?.share_email ?? false}
                  sharePhone={selectedRide.profile?.share_phone ?? false}
                  isCurrentUser={selectedRide.user_id === user?.id}
                  viewerIsStudent={isUserStudent}
                  variant="full"
                  showViewButton={true}
                  distance={0}
                />
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 rounded-full"
                  onClick={() => setSelectedRide(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Badge className={selectedRide.type === 'request' ? 'bg-red-500' : 'bg-green-500'}>
                  {selectedRide.type === 'request' ? (
                    <><Hand className="h-3 w-3 mr-1" /> Request</>
                  ) : (
                    <><Car className="h-3 w-3 mr-1" /> Offer</>
                  )}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium">{selectedRide.pickup_location}</div>
                  <div className="text-muted-foreground">to {selectedRide.dropoff_location}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(selectedRide.ride_date), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {selectedRide.ride_time}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                {selectedRide.type === 'offer'
                  ? `${selectedRide.seats_available} seats available`
                  : `${selectedRide.seats_needed} seats needed`}
              </div>

              {selectedRide.route_details && (
                <p className="text-sm text-muted-foreground pt-2 border-t">
                  {selectedRide.route_details}
                </p>
              )}
            </div>

            {/* Action Button - Only for Parents */}
            {(() => {
              const isOwnRide = selectedRide.user_id === user?.id;
              const responseStatus = getUserResponseStatus(selectedRide.id);
              const hasPendingResponse = responseStatus === 'pending';
              const hasAcceptedResponse = responseStatus === 'accepted';
              const hasDeclinedResponse = responseStatus === 'declined';

              if (isOwnRide) {
                return (
                  <Button className="w-full gap-2" disabled variant="secondary">
                    <CheckCircle className="h-4 w-4" />
                    This is your ride
                  </Button>
                );
              }

              if (!isUserParent) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button className="w-full gap-2" disabled variant="secondary">
                        {selectedRide.type === 'request' ? (
                          <>
                            <Car className="h-4 w-4" />
                            I Can Help!
                          </>
                        ) : (
                          <>
                            <Hand className="h-4 w-4" />
                            I Need This!
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Only parents can manage rides. Ask your parent for help.</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              if (hasPendingResponse) {
                return (
                  <Button className="w-full gap-2" disabled variant="outline">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {selectedRide.type === 'request' ? 'Offer Sent - Pending' : 'Request Pending'}
                  </Button>
                );
              }

              if (hasAcceptedResponse) {
                return (
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" disabled>
                    <CheckCircle className="h-4 w-4" />
                    {selectedRide.type === 'request' ? 'Offer Accepted!' : 'Request Approved!'}
                  </Button>
                );
              }

              if (hasDeclinedResponse) {
                return (
                  <Button className="w-full gap-2" disabled variant="secondary">
                    <X className="h-4 w-4" />
                    {selectedRide.type === 'request' ? 'Offer Declined' : 'Request Declined'}
                  </Button>
                );
              }

              // No existing response - show action button
              return (
                <Button 
                  className="w-full gap-2"
                  onClick={() => initiateRespondToRide(selectedRide)}
                >
                  {selectedRide.type === 'request' ? (
                    <>
                      <Car className="h-4 w-4" />
                      Offer Your Ride
                    </>
                  ) : (
                    <>
                      <Hand className="h-4 w-4" />
                      Request to Join
                    </>
                  )}
                </Button>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Join Ride Confirmation Dialog */}
      <JoinRideDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        onConfirm={handleConfirmResponse}
        ownerName={
          respondingToRide?.profile?.first_name 
            ? `${respondingToRide.profile.first_name} ${respondingToRide.profile.last_name || ''}`.trim()
            : respondingToRide?.profile?.username || 'the ride owner'
        }
        loading={actionLoading}
      />

      {/* Offer Ride Confirmation Dialog */}
      <OfferRideDialog
        open={showOfferDialog}
        onOpenChange={setShowOfferDialog}
        onConfirm={handleConfirmResponse}
        requesterName={
          respondingToRide?.profile?.first_name 
            ? `${respondingToRide.profile.first_name} ${respondingToRide.profile.last_name || ''}`.trim()
            : respondingToRide?.profile?.username || 'the requester'
        }
        loading={actionLoading}
      />
    </div>
  );
};

export default FindRidesMap;
