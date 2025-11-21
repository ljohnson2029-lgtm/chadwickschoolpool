import React, { useEffect, useState, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface School {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}

interface MapViewProps {
  userLocation?: { latitude: number; longitude: number };
  pickupLocation?: { latitude: number; longitude: number };
  dropoffLocation?: { latitude: number; longitude: number };
  routeGeometry?: any;
  height?: string;
}

const MapView: React.FC<MapViewProps> = ({ 
  userLocation, 
  pickupLocation, 
  dropoffLocation,
  routeGeometry,
  height = '400px' 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  useEffect(() => {
    // Fetch Mapbox token from edge function
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
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    // Calculate center point
    const getCenterPoint = () => {
      if (pickupLocation) {
        return [pickupLocation.longitude, pickupLocation.latitude] as [number, number];
      }
      if (userLocation) {
        return [userLocation.longitude, userLocation.latitude] as [number, number];
      }
      // Default to Chadwick School area
      return [-118.3964, 33.7447] as [number, number];
    };

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: getCenterPoint(),
      zoom: 12
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Fetch schools
    const fetchSchools = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*');

      if (error) {
        console.error('Error fetching schools:', error);
        return;
      }

      const schoolData = data || [];
      
      // Add school markers
      schoolData.forEach((school) => {
        new mapboxgl.Marker({ color: '#f59e0b' })
          .setLngLat([school.longitude, school.latitude])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<div><strong>${school.name}</strong><br/>${school.address}</div>`
            )
          )
          .addTo(map.current!);
      });

      setSchools(schoolData);
    };

    fetchSchools();

    // Add user location marker
    if (userLocation) {
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .setPopup(new mapboxgl.Popup().setHTML('<div>Your Location</div>'))
        .addTo(map.current);
    }

    // Add pickup location marker
    if (pickupLocation) {
      new mapboxgl.Marker({ color: '#22c55e' })
        .setLngLat([pickupLocation.longitude, pickupLocation.latitude])
        .setPopup(new mapboxgl.Popup().setHTML('<div>Pickup Location</div>'))
        .addTo(map.current);
    }

    // Add dropoff location marker
    if (dropoffLocation) {
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([dropoffLocation.longitude, dropoffLocation.latitude])
        .setPopup(new mapboxgl.Popup().setHTML('<div>Dropoff Location</div>'))
        .addTo(map.current);
    }

    // Add route line
    if (routeGeometry && map.current) {
      map.current.on('load', () => {
        if (!map.current) return;
        
        map.current.addSource('route', {
          type: 'geojson',
          data: routeGeometry
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': 'hsl(var(--primary))',
            'line-width': 4,
            'line-opacity': 0.75
          }
        });
      });
    }

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [userLocation, pickupLocation, dropoffLocation, routeGeometry, mapboxToken]);

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
    <div 
      ref={mapContainer} 
      className="w-full rounded-lg overflow-hidden border border-border" 
      style={{ height }}
    />
  );
};

export default MapView;
