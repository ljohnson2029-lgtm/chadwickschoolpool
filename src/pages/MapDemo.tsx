import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import MapView from '@/components/MapView';
import ParentProfileCard from '@/components/ParentProfileCard';
import RideRequestForm from '@/components/RideRequestForm';
import RideOfferForm from '@/components/RideOfferForm';
import { useRouteCalculation } from '@/hooks/useRouteCalculation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Navigation, Users, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as turf from '@turf/turf';

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
  const [radiusMiles, setRadiusMiles] = useState<number>(2);
  const [allParents, setAllParents] = useState<ParentProfile[]>([]);
  const [filteredParents, setFilteredParents] = useState<ParentProfile[]>([]);
  const [filteredParentsWithDistance, setFilteredParentsWithDistance] = useState<Array<ParentProfile & { distanceFromRoute: number }>>([]);
  const [userHome, setUserHome] = useState<Location | null>(null);
  const [schoolLocation, setSchoolLocation] = useState<Location | null>(null);
  const [routeToSchool, setRouteToSchool] = useState<any>(null);
  const [isLoadingParents, setIsLoadingParents] = useState(true);
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
        const route = await calculateRoute(
          { latitude: userHome.latitude, longitude: userHome.longitude },
          { latitude: schoolLocation.latitude, longitude: schoolLocation.longitude }
        );
        
        if (route) {
          setRouteToSchool(route);
        }
      }
    };

    calculateUserRoute();
  }, [userHome, schoolLocation, calculateRoute]);

  // Filter parents based on distance from route
  useEffect(() => {
    if (!routeToSchool?.geometry || !allParents.length) {
      setFilteredParents([]);
      setFilteredParentsWithDistance([]);
      return;
    }

    const routeLine = turf.lineString(routeToSchool.geometry.coordinates);
    const radiusKm = radiusMiles * 1.60934; // Convert miles to km

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
      .filter((p): p is ParentProfile & { distanceFromRoute: number } => 
        p !== null && p.distanceFromRoute <= radiusMiles
      );

    setFilteredParents(parentsWithDistance);
    setFilteredParentsWithDistance(parentsWithDistance);
  }, [routeToSchool, allParents, radiusMiles]);

  const handleRadiusChange = (value: number[]) => {
    setRadiusMiles(value[0]);
  };

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
    setShowRideRequestForm(true);
  };

  const handleOfferRide = () => {
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
  const showNoParentsWarning = !showNoAddressWarning && !showNoRouteWarning && filteredParents.length === 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Filter Controls
              </CardTitle>
              <CardDescription>
                Adjust the search radius to find parents along your route
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Radius Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    Show parents within:
                  </label>
                  <span className="text-sm font-bold text-primary">
                    {radiusMiles.toFixed(1)} miles
                  </span>
                </div>
                <Slider
                  value={[radiusMiles]}
                  onValueChange={handleRadiusChange}
                  min={0.5}
                  max={10}
                  step={0.5}
                  className="w-full"
                  disabled={!userHome || !routeToSchool}
                />
                <p className="text-xs text-muted-foreground">
                  Distance from your route to school
                </p>
              </div>

              {/* Stats */}
              {userHome && (
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Route Summary
                  </h3>
                  
                  {isCalculating && (
                    <p className="text-sm text-muted-foreground">Calculating route...</p>
                  )}
                  
                  {routeToSchool && (
                    <>
                      <div className="space-y-1 text-sm">
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Distance:</span>
                          <span className="font-medium">{formatDistance(routeToSchool.distance)}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">{formatDuration(routeToSchool.duration)}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Parents found:</span>
                          <span className="font-bold text-primary">{filteredParents.length}</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Parents list */}
              {filteredParents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Nearby Parents:</h3>
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {filteredParents.map(parent => (
                      <div
                        key={parent.id}
                        className="bg-muted/50 p-3 rounded-lg text-sm space-y-1"
                      >
                        <p className="font-medium">
                          {parent.first_name} {parent.last_name}
                        </p>
                        {parent.phone_number && (
                          <p className="text-xs text-muted-foreground">
                            📞 {parent.phone_number}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          📍 {parent.home_address}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {showNoParentsWarning && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    No parents found within {radiusMiles.toFixed(1)} miles of your route. Try increasing the radius.
                  </AlertDescription>
                </Alert>
              )}

              {/* Instructions */}
              <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                <p className="font-medium">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Your route to school is calculated automatically</li>
                  <li>Parents are shown if they're within the radius</li>
                  <li>Adjust the slider to expand/narrow search</li>
                  <li>Click markers on map for more info</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Map */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Interactive Map</CardTitle>
              <CardDescription>
                Your home (blue), school (orange), nearby parents (green), route (blue line)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MapView
                userLocation={userHome}
                pickupLocation={schoolLocation}
                routeGeometry={routeToSchool?.geometry}
                parentLocations={filteredParents.map(p => ({
                  id: p.id,
                  name: `${p.first_name} ${p.last_name}`,
                  latitude: p.home_latitude!,
                  longitude: p.home_longitude!,
                  address: p.home_address!,
                  phone: p.phone_number
                }))}
                onParentClick={handleParentClick}
                height="600px"
                showStyleControls={true}
                initialZoom={13}
              />
              
              {/* Profile Card Overlay */}
              {selectedParent && (
                <div className="absolute top-4 right-4 z-50 animate-fade-in">
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
        </div>

        {/* Features info */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  Smart Route Analysis
                </h3>
                <p className="text-sm text-muted-foreground">
                  Automatically calculates your optimal route to school and finds parents along the way
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Proximity Filtering
                </h3>
                <p className="text-sm text-muted-foreground">
                  Shows only parents within your selected radius from your driving route
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Interactive Markers
                </h3>
                <p className="text-sm text-muted-foreground">
                  Click parent markers to view contact information and organize carpools
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ride Request Form Dialog */}
      <Dialog open={showRideRequestForm} onOpenChange={setShowRideRequestForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <RideRequestForm onSuccess={handleRideFormSuccess} />
        </DialogContent>
      </Dialog>

      {/* Ride Offer Form Dialog */}
      <Dialog open={showRideOfferForm} onOpenChange={setShowRideOfferForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <RideOfferForm onSuccess={handleRideFormSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MapDemo;
