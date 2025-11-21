import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Location {
  latitude: number;
  longitude: number;
}

interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: any;
}

export const useRouteCalculation = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const { toast } = useToast();

  const calculateRoute = useCallback(async (origin: Location, destination: Location) => {
    setIsCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-route', {
        body: { origin, destination }
      });

      if (error) {
        console.error('Route calculation error:', error);
        toast({
          title: "Route Calculation Failed",
          description: "Could not calculate route between locations",
          variant: "destructive"
        });
        return null;
      }

      if (data) {
        setRouteInfo(data);
        return data;
      }
    } catch (err) {
      console.error('Error calculating route:', err);
      toast({
        title: "Error",
        description: "An error occurred while calculating the route",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
    return null;
  }, [toast]);

  const formatDistance = (meters: number): string => {
    const miles = meters * 0.000621371;
    return `${miles.toFixed(1)} mi`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  };

  return {
    calculateRoute,
    isCalculating,
    routeInfo,
    formatDistance,
    formatDuration
  };
};
