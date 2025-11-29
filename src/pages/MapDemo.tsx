import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Navigation from '@/components/Navigation';
import MapView from '@/components/MapView';
import MapControlPanel, { ParentFilter } from '@/components/MapControlPanel';
import MapLegend from '@/components/MapLegend';
import ParentProfileCard from '@/components/ParentProfileCard';
import RideRequestForm from '@/components/RideRequestForm';
import RideOfferForm from '@/components/RideOfferForm';
import { useRouteCalculation } from '@/hooks/useRouteCalculation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as turf from '@turf/turf';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface ParentProfile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  home_address: string | null;
  home_latitude: number | null;
  home_longitude: number | null;
  account_type: string;
}

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

const MapDemo: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  // State
  const [radiusMiles, setRadiusMiles] = useState<number>(2);
  const debouncedRadius = useDebounce(radiusMiles, 300);
  const [showRoute, setShowRoute] = useState<boolean>(true);
  const [filter, setFilter] = useState<ParentFilter>('all');
  const [controlsCollapsed, setControlsCollapsed] = useState<boolean>(false);
  
  const [allParents, setAllParents] = useState<ParentProfile[]>([]);
  const [filteredParentsWithDistance, setFilteredParentsWithDistance] = useState<Array<ParentProfile & { distanceFromRoute: number }>>([]);
  const [displayedParents, setDisplayedParents] = useState<ParentProfile[]>([]);
  const [linkedParentIds, setLinkedParentIds] = useState<string[]>([]);
  
  const [userHome, setUserHome] = useState<Location | null>(null);
  const [schoolLocation, setSchoolLocation] = useState<Location | null>(null);
  const [routeToSchool, setRouteToSchool] = useState<any>(null);
  
  const [isLoadingParents, setIsLoadingParents] = useState(true);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  
  const [selectedParent, setSelectedParent] = useState<ParentProfile | null>(null);
  const [selectedParentDistance, setSelectedParentDistance] = useState<number | undefined>(undefined);
  const [showRideRequestForm, setShowRideRequestForm] = useState(false);
  const [showRideOfferForm, setShowRideOfferForm] = useState(false);
  
  const { calculateRoute, isCalculating, formatDistance, formatDuration } = useRouteCalculation();

  // Fetch Chadwick School location
  useEffect(() => {
    const fetchSchool = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('name', 'Chadwick School')
        .maybeSingle();

      if (data) {
        setSchoolLocation({
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          address: data.address
        });
      }
    };

    fetchSchool();
  }, []);

  // Fetch linked parents for filtering
  useEffect(() => {
    const fetchLinkedParents = async () => {
      if (!user) return;
      
      const { data, error } = await supabase.rpc('get_linked_students', {
        parent_user_id: user.id
      });

      if (data) {
        setLinkedParentIds(data.map((d: any) => d.student_id));
      }
    };

    fetchLinkedParents();
  }, [user]);

  // Fetch current user's home location
  useEffect(() => {
    if (profile?.home_latitude && profile?.home_longitude && profile?.home_address) {
      setUserHome({
        latitude: profile.home_latitude,
        longitude: profile.home_longitude,
        address: profile.home_address
      });
    }
  }, [profile]);

  // Fetch all parent profiles with addresses
  useEffect(() => {
    const fetchParents = async () => {
      setIsLoadingParents(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_type', 'parent')
        .not('home_latitude', 'is', null)
        .not('home_longitude', 'is', null);

      if (error) {
        console.error('Error fetching parents:', error);
      } else {
        // Filter out current user
        const parents = (data || []).filter(p => p.id !== user?.id);
        setAllParents(parents);
      }
      setIsLoadingParents(false);
    };

    fetchParents();
  }, [user]);

  // Calculate route from user home to school when both are available
  useEffect(() => {
    const calculateUserRoute = async () => {
      if (userHome && schoolLocation) {
        setIsCalculatingRoute(true);
        const route = await calculateRoute(
          { latitude: userHome.latitude, longitude: userHome.longitude },
          { latitude: schoolLocation.latitude, longitude: schoolLocation.longitude }
        );
        
        if (route) {
          setRouteToSchool(route);
        }
        setIsCalculatingRoute(false);
      }
    };

    calculateUserRoute();
  }, [userHome, schoolLocation, calculateRoute]);

  // Filter parents based on distance from route (using debounced radius)
  useEffect(() => {
    if (!allParents.length) {
      setFilteredParentsWithDistance([]);
      setDisplayedParents([]);
      return;
    }

    // If route is not available (e.g. no home address), still show all parents
    if (!routeToSchool?.geometry) {
      const parentsWithDistance = allParents
        .filter(parent => parent.home_latitude && parent.home_longitude)
        .map(parent => ({
          ...parent,
          // Treat as on-route so they pass the radius filter
          distanceFromRoute: 0,
        }));

      setFilteredParentsWithDistance(parentsWithDistance);
      return;
    }

    const routeLine = turf.lineString(routeToSchool.geometry.coordinates);

    const parentsWithDistance = allParents
      .map(parent => {
        if (!parent.home_latitude || !parent.home_longitude) return null;

        const parentPoint = turf.point([parent.home_longitude, parent.home_latitude]);
        const distanceKm = turf.pointToLineDistance(parentPoint, routeLine, { units: 'kilometers' });
        const distanceMiles = distanceKm * 0.621371;
        
        return {
          ...parent,
          distanceFromRoute: distanceMiles
        };
      })
      .filter((p): p is ParentProfile & { distanceFromRoute: number } => p !== null);

    setFilteredParentsWithDistance(parentsWithDistance);
  }, [routeToSchool, allParents]);

  // Apply display filters
  useEffect(() => {
    let filtered = [...filteredParentsWithDistance];

    switch (filter) {
      case 'within-radius':
        filtered = filtered.filter(p => p.distanceFromRoute <= debouncedRadius);
        break;
      case 'linked-only':
        filtered = filtered.filter(p => linkedParentIds.includes(p.id));
        break;
      case 'with-rides':
        // TODO: Implement when rides data is available
        break;
      case 'all':
      default:
        // Show all
        break;
    }

    setDisplayedParents(filtered);
  }, [filteredParentsWithDistance, filter, debouncedRadius, linkedParentIds]);

  const handleRadiusChange = useCallback((value: number[]) => {
    setRadiusMiles(value[0]);
  }, []);

  const handleCenterOnUser = useCallback(() => {
    if (userHome) {
      toast({
        title: "Centered",
        description: "Map centered on your home location",
      });
      // MapView will handle centering via props
    } else {
      toast({
        title: "No Address",
        description: "Please add your home address in your profile",
        variant: "destructive"
      });
    }
  }, [userHome, toast]);

  const handleParentClick = (parent: ParentProfile) => {
    setSelectedParent(parent);
    // Find the distance for this parent
    const parentWithDistance = filteredParentsWithDistance.find(p => p.id === parent.id);
    setSelectedParentDistance(parentWithDistance?.distanceFromRoute);
  };

  const handleCloseProfileCard = () => {
    setSelectedParent(null);
    setSelectedParentDistance(undefined);
  };

  const handleRequestRide = () => {
    if (!selectedParent) return;
    setShowRideRequestForm(true);
  };

  const handleOfferRide = () => {
    if (!selectedParent) return;
    setShowRideOfferForm(true);
  };

  const handleRideFormSuccess = () => {
    setShowRideRequestForm(false);
    setShowRideOfferForm(false);
    setSelectedParent(null);
    toast({
      title: "Success",
      description: "Your ride has been posted successfully!",
    });
  };

  const showNoAddressWarning = !userHome;
  const showNoRouteWarning = userHome && !routeToSchool;
  const showNoParentsWarning = !showNoAddressWarning && !showNoRouteWarning && displayedParents.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-8 px-4 pt-24">
        <div className="max-w-full mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Proximity Parent Finder</h1>
            <p className="text-muted-foreground">
              Find parents along your route to Chadwick School
            </p>
          </div>

        {/* Warning alerts */}
        {showNoAddressWarning && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please add your home address in your profile settings to see nearby parents and calculate routes.
            </AlertDescription>
          </Alert>
        )}

        {/* Map Container */}
        <Card className="relative">
          <CardContent className="p-0 relative">
            {/* Loading Overlay */}
            {(isLoadingParents || isCalculatingRoute) && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {isLoadingParents ? "Loading parent locations..." : "Calculating routes..."}
                  </p>
                </div>
              </div>
            )}

            {/* Map Controls - Top Right */}
            <div className="absolute top-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)]">
              <MapControlPanel
                radiusMiles={radiusMiles}
                onRadiusChange={handleRadiusChange}
                showRoute={showRoute}
                onShowRouteChange={setShowRoute}
                filter={filter}
                onFilterChange={setFilter}
                onCenterOnUser={handleCenterOnUser}
                isCollapsed={controlsCollapsed}
                onToggleCollapse={() => setControlsCollapsed(!controlsCollapsed)}
                disabled={!userHome || !routeToSchool}
              />
            </div>

            {/* Map Legend - Bottom Left */}
            <div className="absolute bottom-4 left-4 z-40 w-auto">
              <MapLegend
                parentsCount={allParents.length}
                filteredCount={displayedParents.length}
              />
            </div>

            {/* Map */}
            <MapView
              userLocation={userHome}
              pickupLocation={schoolLocation}
              routeGeometry={showRoute ? routeToSchool?.geometry : null}
              parentLocations={displayedParents.map(p => ({
                id: p.id,
                name: `${p.first_name} ${p.last_name}`,
                latitude: p.home_latitude!,
                longitude: p.home_longitude!,
                address: p.home_address!,
                phone: p.phone_number
              }))}
              onParentClick={handleParentClick}
              height="700px"
              showStyleControls={true}
              initialZoom={13}
            />

            {/* Profile Card Overlay - Top Right Below Controls */}
            {selectedParent && (
              <div className="absolute top-4 right-4 z-50 mt-[420px] animate-scale-in">
                <ParentProfileCard
                  parentId={selectedParent.id}
                  parentName={`${selectedParent.first_name} ${selectedParent.last_name}`}
                  phone={selectedParent.phone_number}
                  address={selectedParent.home_address!}
                  distanceFromRoute={selectedParentDistance}
                  onClose={handleCloseProfileCard}
                  onRequestRide={handleRequestRide}
                  onOfferRide={handleOfferRide}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empty State */}
        {showNoParentsWarning && !isLoadingParents && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              No parents found within {radiusMiles.toFixed(1)} miles of your route. Try increasing the radius or adjusting filters.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Ride Request Form Dialog */}
      <Dialog open={showRideRequestForm} onOpenChange={setShowRideRequestForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <RideRequestForm 
            onSuccess={handleRideFormSuccess}
            recipientParentId={selectedParent?.id}
            recipientParentName={selectedParent ? `${selectedParent.first_name} ${selectedParent.last_name}` : undefined}
            prefillPickup={userHome?.address || profile?.home_address || ""}
            prefillDropoff={schoolLocation?.address || "Chadwick School, 26800 Academy Drive, Palos Verdes Peninsula, CA"}
          />
        </DialogContent>
      </Dialog>

      {/* Ride Offer Form Dialog */}
      <Dialog open={showRideOfferForm} onOpenChange={setShowRideOfferForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <RideOfferForm 
            onSuccess={handleRideFormSuccess}
            recipientParentId={selectedParent?.id}
            recipientParentName={selectedParent ? `${selectedParent.first_name} ${selectedParent.last_name}` : undefined}
            prefillPickup={userHome?.address || profile?.home_address || ""}
            prefillDropoff={selectedParent?.home_address || schoolLocation?.address || "Chadwick School"}
          />
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
};

export default MapDemo;
