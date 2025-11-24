import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';

interface Ride {
  id: string;
  type: 'request' | 'offer';
  pickup_location: string;
  dropoff_location: string;
  ride_date: string;
  ride_time: string;
  seats_needed?: number;
  seats_available?: number;
  user_id: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
}

interface UserAddress {
  user_id: string;
  home_address: string;
  first_name: string | null;
  last_name: string | null;
  username: string;
}

interface CarpoolMapViewProps {
  height?: string;
}

const CarpoolMapView: React.FC<CarpoolMapViewProps> = ({ height = '500px' }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [rides, setRides] = useState<Ride[]>([]);
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
  const [showRequests, setShowRequests] = useState(true);
  const [showOffers, setShowOffers] = useState(true);
  const [showAddresses, setShowAddresses] = useState(true);

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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch rides
      const { data: ridesData } = await supabase
        .from('rides')
        .select(`
          *,
          profile:profiles!rides_user_id_fkey(first_name, last_name, username)
        `)
        .eq('status', 'active');

      if (ridesData) {
        setRides(ridesData as any);
      }

      // Fetch user addresses (profiles with home_address)
      const { data: addressData } = await supabase
        .from('profiles')
        .select('id, home_address, first_name, last_name, username')
        .not('home_address', 'is', null);

      if (addressData) {
        setUserAddresses(addressData.map(p => ({
          user_id: p.id,
          home_address: p.home_address!,
          first_name: p.first_name,
          last_name: p.last_name,
          username: p.username
        })));
      }
    };

    fetchData();
  }, [user]);

  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address }
      });

      if (error || !data?.coordinates) {
        console.error('Geocoding error:', error);
        return null;
      }

      return [data.coordinates.longitude, data.coordinates.latitude];
    } catch (err) {
      console.error('Error geocoding:', err);
      return null;
    }
  };

  const calculateDistance = (coord1: [number, number], coord2: [number, number]): string => {
    const R = 3958.8; // Earth's radius in miles
    const lat1 = coord1[1] * Math.PI / 180;
    const lat2 = coord2[1] * Math.PI / 180;
    const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return `${distance.toFixed(1)} mi`;
  };

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !profile) return;

    mapboxgl.accessToken = mapboxToken;

    // Initialize map centered on user's home or default location
    const centerCoord: [number, number] = [-118.3964, 33.7447]; // Default to Chadwick area

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

  useEffect(() => {
    if (!map.current || !mapboxToken) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const addMarkers = async () => {
      let userHomeCoord: [number, number] | null = null;

      // Add user's home marker (blue)
      if (profile?.home_address) {
        userHomeCoord = await geocodeAddress(profile.home_address);
        if (userHomeCoord) {
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.style.backgroundColor = '#3b82f6';
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.borderRadius = '50%';
          el.style.border = '3px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

          const marker = new mapboxgl.Marker(el)
            .setLngLat(userHomeCoord)
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                  <p class="font-semibold text-blue-600">Your Home</p>
                  <p class="text-sm text-muted-foreground">${profile.home_address}</p>
                </div>
              `)
            )
            .addTo(map.current!);
          
          markersRef.current.push(marker);

          // Center map on user's home
          map.current?.setCenter(userHomeCoord);
        }
      }

      // Add ride request markers (red)
      if (showRequests) {
        for (const ride of rides.filter(r => r.type === 'request')) {
          const pickupCoord = await geocodeAddress(ride.pickup_location);
          const dropoffCoord = await geocodeAddress(ride.dropoff_location);

          if (pickupCoord) {
            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.style.backgroundColor = '#ef4444';
            el.style.width = '18px';
            el.style.height = '18px';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

            const distanceText = userHomeCoord 
              ? `<p class="text-xs text-muted-foreground mt-1">Distance from you: ${calculateDistance(userHomeCoord, pickupCoord)}</p>`
              : '';

            const marker = new mapboxgl.Marker(el)
              .setLngLat(pickupCoord)
              .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(`
                  <div class="p-3 min-w-[200px]">
                    <Badge class="mb-2 bg-red-500">Ride Request</Badge>
                    <p class="font-semibold">${ride.profile?.first_name || ''} ${ride.profile?.last_name || ''}</p>
                    <p class="text-xs text-muted-foreground">@${ride.profile?.username}</p>
                    <div class="mt-2 space-y-1 text-sm">
                      <p><strong>Pickup:</strong> ${ride.pickup_location}</p>
                      <p><strong>Dropoff:</strong> ${ride.dropoff_location}</p>
                      <p><strong>Date:</strong> ${new Date(ride.ride_date).toLocaleDateString()}</p>
                      <p><strong>Time:</strong> ${ride.ride_time}</p>
                      <p><strong>Seats needed:</strong> ${ride.seats_needed || 'N/A'}</p>
                    </div>
                    ${distanceText}
                  </div>
                `)
              )
              .addTo(map.current!);
            
            markersRef.current.push(marker);
          }

          // Add route line if both coordinates exist
          if (pickupCoord && dropoffCoord && map.current) {
            const routeId = `route-${ride.id}`;
            if (!map.current.getSource(routeId)) {
              map.current.addSource(routeId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [pickupCoord, dropoffCoord]
                  }
                }
              });

              map.current.addLayer({
                id: routeId,
                type: 'line',
                source: routeId,
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                paint: {
                  'line-color': '#ef4444',
                  'line-width': 3,
                  'line-opacity': 0.6,
                  'line-dasharray': [2, 2]
                }
              });
            }
          }
        }
      }

      // Add ride offer markers (green)
      if (showOffers) {
        for (const ride of rides.filter(r => r.type === 'offer')) {
          const pickupCoord = await geocodeAddress(ride.pickup_location);
          const dropoffCoord = await geocodeAddress(ride.dropoff_location);

          if (pickupCoord) {
            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.style.backgroundColor = '#22c55e';
            el.style.width = '18px';
            el.style.height = '18px';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

            const distanceText = userHomeCoord 
              ? `<p class="text-xs text-muted-foreground mt-1">Distance from you: ${calculateDistance(userHomeCoord, pickupCoord)}</p>`
              : '';

            const marker = new mapboxgl.Marker(el)
              .setLngLat(pickupCoord)
              .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(`
                  <div class="p-3 min-w-[200px]">
                    <Badge class="mb-2 bg-green-500">Ride Offer</Badge>
                    <p class="font-semibold">${ride.profile?.first_name || ''} ${ride.profile?.last_name || ''}</p>
                    <p class="text-xs text-muted-foreground">@${ride.profile?.username}</p>
                    <div class="mt-2 space-y-1 text-sm">
                      <p><strong>Starting:</strong> ${ride.pickup_location}</p>
                      <p><strong>Destination:</strong> ${ride.dropoff_location}</p>
                      <p><strong>Date:</strong> ${new Date(ride.ride_date).toLocaleDateString()}</p>
                      <p><strong>Time:</strong> ${ride.ride_time}</p>
                      <p><strong>Seats available:</strong> ${ride.seats_available || 'N/A'}</p>
                    </div>
                    ${distanceText}
                  </div>
                `)
              )
              .addTo(map.current!);
            
            markersRef.current.push(marker);
          }

          // Add route line
          if (pickupCoord && dropoffCoord && map.current) {
            const routeId = `route-${ride.id}`;
            if (!map.current.getSource(routeId)) {
              map.current.addSource(routeId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [pickupCoord, dropoffCoord]
                  }
                }
              });

              map.current.addLayer({
                id: routeId,
                type: 'line',
                source: routeId,
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                paint: {
                  'line-color': '#22c55e',
                  'line-width': 3,
                  'line-opacity': 0.6
                }
              });
            }
          }
        }
      }

      // Add other users' home addresses (gray)
      if (showAddresses) {
        for (const userAddr of userAddresses) {
          if (userAddr.user_id === user?.id) continue; // Skip current user

          const coord = await geocodeAddress(userAddr.home_address);
          if (coord) {
            const el = document.createElement('div');
            el.className = 'custom-marker';
            el.style.backgroundColor = '#6b7280';
            el.style.width = '14px';
            el.style.height = '14px';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

            const distanceText = userHomeCoord 
              ? `<p class="text-xs text-muted-foreground mt-1">Distance from you: ${calculateDistance(userHomeCoord, coord)}</p>`
              : '';

            const marker = new mapboxgl.Marker(el)
              .setLngLat(coord)
              .setPopup(
                new mapboxgl.Popup({ offset: 20 }).setHTML(`
                  <div class="p-2">
                    <p class="font-semibold">${userAddr.first_name || ''} ${userAddr.last_name || ''}</p>
                    <p class="text-xs text-muted-foreground">@${userAddr.username}</p>
                    <p class="text-sm mt-1">${userAddr.home_address}</p>
                    ${distanceText}
                  </div>
                `)
              )
              .addTo(map.current!);
            
            markersRef.current.push(marker);
          }
        }
      }
    };

    addMarkers();
  }, [rides, userAddresses, showRequests, showOffers, showAddresses, profile, user]);

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
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Switch 
              id="show-requests" 
              checked={showRequests} 
              onCheckedChange={setShowRequests}
            />
            <Label htmlFor="show-requests" className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Show Ride Requests
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              id="show-offers" 
              checked={showOffers} 
              onCheckedChange={setShowOffers}
            />
            <Label htmlFor="show-offers" className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Show Ride Offers
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              id="show-addresses" 
              checked={showAddresses} 
              onCheckedChange={setShowAddresses}
            />
            <Label htmlFor="show-addresses" className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              Show Home Addresses
            </Label>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
            <span>Your Home</span>
          </div>
        </div>
      </Card>

      <div className="relative w-full" style={{ height }}>
        <div 
          ref={mapContainer} 
          className="w-full h-full rounded-lg overflow-hidden border border-border"
        />
      </div>
    </div>
  );
};

export default CarpoolMapView;
