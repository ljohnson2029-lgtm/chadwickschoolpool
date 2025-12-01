import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import ParentProfileSheet from "@/components/ParentProfileSheet";
import ParentProfilePopup from "@/components/ParentProfilePopup";
import PrivateRideRequestModal from "@/components/PrivateRideRequestModal";
import PrivateRideOfferModal from "@/components/PrivateRideOfferModal";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, School, Navigation as NavigationIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import * as turf from "@turf/turf";

interface ParentLocation {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  home_latitude: number;
  home_longitude: number;
  home_address: string | null;
  distance_from_route?: number;
}

const CHADWICK_SCHOOL = {
  name: "Chadwick School",
  address: "26800 S Academy Dr, Palos Verdes Peninsula, CA 90274",
  latitude: 33.77667,
  longitude: -118.36111,
};

const MapFindParents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [parents, setParents] = useState<ParentLocation[]>([]);
  const [filteredParents, setFilteredParents] = useState<ParentLocation[]>([]);
  const [radiusMiles, setRadiusMiles] = useState([2]);
  const [showRoute, setShowRoute] = useState(true);
  const [showSchool, setShowSchool] = useState(true);
  const [clusterMarkers, setClusterMarkers] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedParentName, setSelectedParentName] = useState("");
  const [selectedParentDistance, setSelectedParentDistance] = useState(0);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [contactedParents, setContactedParents] = useState<Set<string>>(new Set());
  
  const isMobile = useIsMobile();
  const markers = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Handle profile popup close
  const handleCloseProfile = useCallback(() => {
    setProfilePopupOpen(false);
    setSelectedParentId(null);
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
  }, []);

  // Handle parent marker click
  const handleParentClick = useCallback((parent: ParentLocation) => {
    const fullName = parent.first_name && parent.last_name
      ? `${parent.first_name} ${parent.last_name}`
      : parent.username;
    
    setSelectedParentId(parent.id);
    setSelectedParentName(fullName);
    setSelectedParentDistance(parent.distance_from_route || 0);
    
    if (isMobile) {
      // Mobile: Use bottom sheet
      setProfilePopupOpen(true);
    } else {
      // Desktop: Use Mapbox popup
      handleCloseProfile(); // Close any existing popup
      
      const popupContainer = document.createElement('div');
      popupContainer.id = `popup-${parent.id}`;
      
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        maxWidth: '380px',
        className: 'parent-profile-popup'
      })
        .setLngLat([parent.home_longitude, parent.home_latitude])
        .setDOMContent(popupContainer)
        .addTo(map.current!);

      popupRef.current = popup;
      setProfilePopupOpen(true);

      // Cleanup when popup is closed
      popup.on('close', handleCloseProfile);
    }
  }, [isMobile, handleCloseProfile]);

  // Handle action buttons
  const handleRequestRide = useCallback((parentId: string, parentName: string) => {
    setSelectedParentId(parentId);
    setSelectedParentName(parentName);
    handleCloseProfile(); // Close profile popup
    setRequestModalOpen(true);
  }, [handleCloseProfile]);

  const handleOfferRide = useCallback((parentId: string, parentName: string) => {
    setSelectedParentId(parentId);
    setSelectedParentName(parentName);
    handleCloseProfile(); // Close profile popup
    setOfferModalOpen(true);
  }, [handleCloseProfile]);

  const handleRequestSuccess = useCallback(() => {
    if (selectedParentId) {
      setContactedParents(prev => new Set(prev).add(selectedParentId));
    }
  }, [selectedParentId]);

  const handleOfferSuccess = useCallback(() => {
    if (selectedParentId) {
      setContactedParents(prev => new Set(prev).add(selectedParentId));
    }
  }, [selectedParentId]);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
          mapboxgl.accessToken = data.token;
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        toast({
          title: "Error",
          description: "Failed to load map. Please refresh the page.",
          variant: "destructive",
        });
      }
    };
    fetchToken();
  }, [toast]);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (!profile?.home_latitude || !profile?.home_longitude) {
          toast({
            title: "Address Required",
            description: "Please add your home address in Settings to use this feature.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load your profile.",
          variant: "destructive",
        });
      }
    };
    fetchUserProfile();
  }, [navigate, toast]);

  // Fetch parent locations
  useEffect(() => {
    const fetchParents = async () => {
      if (!userProfile) return;

      try {
        const { data, error } = await supabase.functions.invoke('get-parent-locations');
        
        if (error) throw error;

        // Filter out current user
        const otherParents = (data?.parents || []).filter(
          (p: ParentLocation) => p.id !== userProfile.id
        );
        
        setParents(otherParents);
      } catch (error) {
        console.error('Error fetching parents:', error);
        toast({
          title: "Error",
          description: "Failed to load parent locations.",
          variant: "destructive",
        });
      }
    };
    fetchParents();
  }, [userProfile, toast]);

  // Calculate route from user home to school
  useEffect(() => {
    const calculateRoute = async () => {
      if (!userProfile || !mapboxToken) return;

      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${userProfile.home_longitude},${userProfile.home_latitude};${CHADWICK_SCHOOL.longitude},${CHADWICK_SCHOOL.latitude}?geometries=geojson&access_token=${mapboxToken}`
        );
        
        const data = await response.json();
        
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates as [number, number][];
          setRouteCoordinates(coords);
        }
      } catch (error) {
        console.error('Error calculating route:', error);
        // Use straight line as fallback
        setRouteCoordinates([
          [userProfile.home_longitude, userProfile.home_latitude],
          [CHADWICK_SCHOOL.longitude, CHADWICK_SCHOOL.latitude]
        ]);
      } finally {
        setLoading(false);
      }
    };
    calculateRoute();
  }, [userProfile, mapboxToken]);

  // Calculate distance from each parent to route and filter
  useEffect(() => {
    if (!routeCoordinates || parents.length === 0) {
      setFilteredParents([]);
      return;
    }

    const routeLine = turf.lineString(routeCoordinates);
    const radiusInMiles = radiusMiles[0];

    const parentsWithDistance = parents.map(parent => {
      const parentPoint = turf.point([parent.home_longitude, parent.home_latitude]);
      const nearestPoint = turf.nearestPointOnLine(routeLine, parentPoint);
      const distanceInKm = turf.distance(parentPoint, nearestPoint, { units: 'kilometers' });
      const distanceInMiles = distanceInKm * 0.621371;

      return {
        ...parent,
        distance_from_route: distanceInMiles,
      };
    });

    const filtered = parentsWithDistance.filter(p => p.distance_from_route! <= radiusInMiles);
    setFilteredParents(filtered);
  }, [parents, routeCoordinates, radiusMiles]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !userProfile || !mapboxToken || loading) return;

    // Calculate map center (midpoint between home and school)
    const centerLng = (userProfile.home_longitude + CHADWICK_SCHOOL.longitude) / 2;
    const centerLat = (userProfile.home_latitude + CHADWICK_SCHOOL.latitude) / 2;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [centerLng, centerLat],
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-left');
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'top-left'
    );

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [userProfile, mapboxToken, loading]);

  // Draw route line
  useEffect(() => {
    if (!map.current || !routeCoordinates || !showRoute) {
      if (map.current?.getSource('route')) {
        map.current.removeLayer('route-line');
        map.current.removeSource('route');
      }
      return;
    }

    map.current.on('load', () => {
      if (!map.current || !routeCoordinates) return;

      if (map.current.getSource('route')) {
        (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
        });
      } else {
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates,
            },
          },
        });

        map.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3B82F6',
            'line-width': 4,
            'line-opacity': 0.6,
          },
        });
      }
    });
  }, [routeCoordinates, showRoute]);

  // Add markers
  useEffect(() => {
    if (!map.current || !userProfile) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add user's home marker (blue)
    const userHomeEl = document.createElement('div');
    userHomeEl.className = 'flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full shadow-lg border-2 border-white';
    userHomeEl.innerHTML = '<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>';
    
    const userMarker = new mapboxgl.Marker(userHomeEl)
      .setLngLat([userProfile.home_longitude, userProfile.home_latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2"><strong>Your Home</strong><br/>${userProfile.home_address || 'Your location'}</div>`
      ))
      .addTo(map.current);
    markers.current.push(userMarker);

    // Add school marker (orange)
    if (showSchool) {
      const schoolEl = document.createElement('div');
      schoolEl.className = 'flex items-center justify-center w-10 h-10 bg-orange-500 rounded-full shadow-lg border-2 border-white';
      schoolEl.innerHTML = '<span class="text-2xl">🏫</span>';
      
      const schoolMarker = new mapboxgl.Marker(schoolEl)
        .setLngLat([CHADWICK_SCHOOL.longitude, CHADWICK_SCHOOL.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2"><strong>${CHADWICK_SCHOOL.name}</strong><br/>${CHADWICK_SCHOOL.address}</div>`
        ))
        .addTo(map.current);
      markers.current.push(schoolMarker);
    }

  // Add parent markers (within radius - clickable)
    filteredParents.forEach(parent => {
      const isWithinRadius = parent.distance_from_route! <= radiusMiles[0];
      
      console.log(`Parent ${parent.username}: lat=${parent.home_latitude}, lng=${parent.home_longitude}, distance=${parent.distance_from_route?.toFixed(2)}mi, isWithin=${isWithinRadius}`);
      
      if (isWithinRadius) {
        const isContacted = contactedParents.has(parent.id);
        const parentEl = document.createElement('div');
        parentEl.className = `relative flex items-center justify-center w-8 h-8 bg-green-500 rounded-full shadow-lg border-2 border-white cursor-pointer hover:scale-110 transition-transform ${isContacted ? 'opacity-60' : ''}`;
        parentEl.innerHTML = `
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
          </svg>
          ${isContacted ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center"><svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg></div>' : ''}
        `;
        
        console.log(`Adding marker at [${parent.home_longitude}, ${parent.home_latitude}] for ${parent.username}`);
        const parentMarker = new mapboxgl.Marker(parentEl)
          .setLngLat([parent.home_longitude, parent.home_latitude])
          .addTo(map.current!);

        // Add click handler
        parentEl.addEventListener('click', (e) => {
          e.stopPropagation();
          handleParentClick(parent);
        });

        markers.current.push(parentMarker);
      }
    });

    // Add parent markers that are outside radius (dimmed)
    parents
      .filter(parent => !filteredParents.some(fp => fp.id === parent.id))
      .forEach(parent => {
        const parentEl = document.createElement('div');
        parentEl.className = 'flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full shadow-lg border-2 border-white opacity-40';
        parentEl.innerHTML = '<svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>';
        
        console.log(`Adding gray marker at [${parent.home_longitude}, ${parent.home_latitude}] for ${parent.username} (outside radius)`);
        const parentMarker = new mapboxgl.Marker(parentEl)
          .setLngLat([parent.home_longitude, parent.home_latitude])
          .addTo(map.current!);
        markers.current.push(parentMarker);
      });
  }, [map.current, userProfile, filteredParents, parents, radiusMiles, showSchool, handleParentClick, contactedParents]);

  // Render desktop popup content
  useEffect(() => {
    if (!profilePopupOpen || isMobile || !selectedParentId) return;

    const popupContainer = document.getElementById(`popup-${selectedParentId}`);
    if (popupContainer && !popupContainer.hasChildNodes()) {
      const root = document.createElement('div');
      popupContainer.appendChild(root);
      
      import('react-dom/client').then(({ createRoot }) => {
        const reactRoot = createRoot(root);
        reactRoot.render(
          <ParentProfilePopup
            parentId={selectedParentId}
            distance={selectedParentDistance}
            onClose={handleCloseProfile}
            onRequestRide={handleRequestRide}
            onOfferRide={handleOfferRide}
          />
        );
      });
    }
  }, [profilePopupOpen, isMobile, selectedParentId, selectedParentDistance, handleCloseProfile, handleRequestRide, handleOfferRide]);

  const handleResetView = useCallback(() => {
    if (!map.current || !userProfile) return;
    const centerLng = (userProfile.home_longitude + CHADWICK_SCHOOL.longitude) / 2;
    const centerLat = (userProfile.home_latitude + CHADWICK_SCHOOL.latitude) / 2;
    map.current.flyTo({ center: [centerLng, centerLat], zoom: 11 });
  }, [userProfile]);

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background pt-20 px-4">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96 mb-6" />
            <Skeleton className="h-[600px] w-full rounded-lg" />
          </div>
        </div>
      </>
    );
  }

  if (!userProfile?.home_latitude || !userProfile?.home_longitude) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background pt-20 px-4">
          <div className="max-w-4xl mx-auto text-center py-20">
            <Home className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-4">Address Required</h2>
            <p className="text-muted-foreground mb-6">
              Please add your home address in Settings to use the map feature.
            </p>
            <Button onClick={() => navigate('/settings')}>Go to Settings</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background pt-20 px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Find Parents Near Your Route</h1>
            <p className="text-muted-foreground mb-1">
              Discover carpool partners who live along your route to Chadwick School
            </p>
            <p className="text-sm text-muted-foreground">
              Adjust the radius to find parents within your preferred distance. Click any marker to send a private ride request.
            </p>
          </div>

          {/* Map Container */}
          <div className="relative w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
            <div ref={mapContainer} className="absolute inset-0" />

            {/* Control Panel */}
            <Card className="absolute top-4 right-4 p-4 w-80 bg-background/95 backdrop-blur-sm shadow-xl">
              <div className="space-y-4">
                {/* Radius Slider */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Show parents within:
                  </label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={radiusMiles}
                      onValueChange={setRadiusMiles}
                      min={0.5}
                      max={10}
                      step={0.25}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold w-20 text-right">
                      {radiusMiles[0].toFixed(1)} mi
                    </span>
                  </div>
                </div>

                {/* View Toggles */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-route"
                      checked={showRoute}
                      onCheckedChange={(checked) => setShowRoute(checked as boolean)}
                    />
                    <label htmlFor="show-route" className="text-sm cursor-pointer">
                      Show my route
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-school"
                      checked={showSchool}
                      onCheckedChange={(checked) => setShowSchool(checked as boolean)}
                    />
                    <label htmlFor="show-school" className="text-sm cursor-pointer">
                      Show school location
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cluster-markers"
                      checked={clusterMarkers}
                      onCheckedChange={(checked) => setClusterMarkers(checked as boolean)}
                    />
                    <label htmlFor="cluster-markers" className="text-sm cursor-pointer">
                      Cluster markers
                    </label>
                  </div>
                </div>

                {/* Stats */}
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{filteredParents.length}</span> parent{filteredParents.length !== 1 ? 's' : ''} within {radiusMiles[0].toFixed(1)} miles
                  </div>
                  {parents.length === 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      No other parents have joined yet
                    </div>
                  )}
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetView}
                  className="w-full"
                >
                  <NavigationIcon className="w-4 h-4 mr-2" />
                  Reset View
                </Button>
              </div>
            </Card>

            {/* Legend */}
            <Card className="absolute bottom-4 left-4 p-3 bg-background/95 backdrop-blur-sm">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Home className="w-3 h-3 text-white" />
                  </div>
                  <span>Your Home</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center">
                    <School className="w-3 h-3 text-white" />
                  </div>
                  <span>Chadwick School</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
                  <span>Within radius</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-400 rounded-full border-2 border-white opacity-50" />
                  <span>Outside radius</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Mobile Profile Sheet */}
        {isMobile && selectedParentId && (
          <ParentProfileSheet
            open={profilePopupOpen}
            parentId={selectedParentId}
            distance={selectedParentDistance}
            onClose={handleCloseProfile}
            onRequestRide={handleRequestRide}
            onOfferRide={handleOfferRide}
          />
        )}

        {/* Request Ride Modal */}
        {selectedParentId && userProfile && (
          <PrivateRideRequestModal
            open={requestModalOpen}
            onClose={() => setRequestModalOpen(false)}
            recipientId={selectedParentId}
            recipientName={selectedParentName}
            distance={selectedParentDistance}
            userProfile={userProfile}
            onSuccess={handleRequestSuccess}
          />
        )}

        {/* Offer Ride Modal */}
        {selectedParentId && userProfile && (
          <PrivateRideOfferModal
            open={offerModalOpen}
            onClose={() => setOfferModalOpen(false)}
            recipientId={selectedParentId}
            recipientName={selectedParentName}
            distance={selectedParentDistance}
            userProfile={userProfile}
            onSuccess={handleOfferSuccess}
          />
        )}
      </div>
    </>
  );
};

export default MapFindParents;
