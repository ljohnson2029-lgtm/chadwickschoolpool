import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MapView from '@/components/MapView';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { useRouteCalculation } from '@/hooks/useRouteCalculation';
import { MapPin, Navigation } from 'lucide-react';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

const MapDemo: React.FC = () => {
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  
  const { calculateRoute, isCalculating, routeInfo, formatDistance, formatDuration } = useRouteCalculation();

  const handleCalculateRoute = async () => {
    if (pickupLocation && dropoffLocation) {
      const route = await calculateRoute(
        { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
        { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude }
      );
      
      // Log route info for debugging
      if (route) {
        console.log('Route calculated:', {
          distance: formatDistance(route.distance),
          duration: formatDuration(route.duration),
          hasGeometry: !!route.geometry
        });
      }
    }
  };

  // Quick test route to Chadwick School
  const setRouteToChadwick = () => {
    setPickupAddress('26800 Academy Drive, Palos Verdes Peninsula, CA');
    setPickupLocation({
      latitude: 33.77667,
      longitude: -118.36111,
      address: '26800 Academy Drive, Palos Verdes Peninsula, CA'
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Map & Route Planning</h1>
          <p className="text-muted-foreground">
            Full visual map with roads, buildings, houses, and terrain for the entire South Bay area
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Route Planning
              </CardTitle>
              <CardDescription>
                Enter pickup and dropoff locations to plan your route
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pickup Location
                </label>
                <AddressAutocomplete
                  value={pickupAddress}
                  onChange={setPickupAddress}
                  onLocationSelect={(location) => {
                    setPickupLocation(location);
                    console.log('Pickup location selected:', location);
                  }}
                  placeholder="Enter pickup address"
                />
                {pickupLocation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {pickupLocation.address}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Dropoff Location
                </label>
                <AddressAutocomplete
                  value={dropoffAddress}
                  onChange={setDropoffAddress}
                  onLocationSelect={(location) => {
                    setDropoffLocation(location);
                    console.log('Dropoff location selected:', location);
                  }}
                  placeholder="Enter dropoff address"
                />
                {dropoffLocation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {dropoffLocation.address}
                  </p>
                )}
              </div>

              {/* Quick actions */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Quick Actions:</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={setRouteToChadwick}
                  className="w-full text-xs"
                >
                  Set Chadwick as Pickup
                </Button>
              </div>

              <Button
                onClick={handleCalculateRoute}
                disabled={!pickupLocation || !dropoffLocation || isCalculating}
                className="w-full"
              >
                <Navigation className="h-4 w-4 mr-2" />
                {isCalculating ? 'Calculating...' : 'Calculate Route'}
              </Button>

              {routeInfo && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Route Information
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="font-medium">{formatDistance(routeInfo.distance)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{formatDuration(routeInfo.duration)}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1">
                <p className="font-medium">How to use:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Enter pickup address and click 📍</li>
                  <li>Enter dropoff address and click 📍</li>
                  <li>Click "Calculate Route"</li>
                  <li>View route on map with distance/time</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Interactive Map</CardTitle>
              <CardDescription>
                Real map with all roads, buildings & houses. Switch between Streets, Satellite & Hybrid views. Schools (orange), pickup (green), dropoff (red)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MapView
                pickupLocation={pickupLocation ? {
                  latitude: pickupLocation.latitude,
                  longitude: pickupLocation.longitude
                } : undefined}
                dropoffLocation={dropoffLocation ? {
                  latitude: dropoffLocation.latitude,
                  longitude: dropoffLocation.longitude
                } : undefined}
                routeGeometry={routeInfo?.geometry}
                height="600px"
                showStyleControls={true}
                initialZoom={14}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Address Geocoding
                </h3>
                <p className="text-sm text-muted-foreground">
                  Convert addresses to coordinates with validation and suggestions
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  Route Planning
                </h3>
                <p className="text-sm text-muted-foreground">
                  Calculate driving routes with distance and time estimates
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  School Locations
                </h3>
                <p className="text-sm text-muted-foreground">
                  View nearby schools with addresses and interactive markers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MapDemo;
