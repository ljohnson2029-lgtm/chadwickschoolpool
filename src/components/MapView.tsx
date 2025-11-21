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
  showStyleControls?: boolean;
  initialZoom?: number;
}

const MapView: React.FC<MapViewProps> = ({ 
  userLocation, 
  pickupLocation, 
  dropoffLocation,
  routeGeometry,
  height = '400px',
  showStyleControls = true,
  initialZoom = 13
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'hybrid'>('streets');
  const [terrainEnabled, setTerrainEnabled] = useState<boolean>(true);
  const [controlsExpanded, setControlsExpanded] = useState<boolean>(false);

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

    // Get the correct map style based on current selection
    const getMapStyle = () => {
      switch (mapStyle) {
        case 'satellite':
          return 'mapbox://styles/mapbox/satellite-streets-v12';
        case 'hybrid':
          return 'mapbox://styles/mapbox/satellite-streets-v12';
        case 'streets':
        default:
          return 'mapbox://styles/mapbox/streets-v12';
      }
    };

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
      center: getCenterPoint(),
      zoom: initialZoom,
      pitch: 45, // Tilt the map for 3D effect
      bearing: 0,
      antialias: true // Enable smoother rendering
    });

    // Add navigation controls (zoom, rotation, pitch)
    map.current.addControl(new mapboxgl.NavigationControl({
      visualizePitch: true
    }), 'top-right');

    // Add scale control
    map.current.addControl(new mapboxgl.ScaleControl({
      maxWidth: 100,
      unit: 'imperial'
    }), 'bottom-left');

    // Add geolocate control (find my location)
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    // Enable 3D terrain and buildings
    map.current.on('load', () => {
      if (!map.current) return;

      // Add terrain source (3D elevation data)
      map.current.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });

      // Set terrain on the map
      if (terrainEnabled) {
        map.current.setTerrain({ 
          source: 'mapbox-dem', 
          exaggeration: 1.5 // Makes hills more visible
        });
      }

      // Add sky layer for realistic atmosphere
      map.current.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15
        }
      });

      // Add hillshade layer to visualize terrain relief
      map.current.addLayer({
        id: 'hillshade',
        type: 'hillshade',
        source: 'mapbox-dem',
        layout: { visibility: terrainEnabled ? 'visible' : 'none' },
        paint: {
          'hillshade-shadow-color': '#473B24',
          'hillshade-illumination-direction': 315,
          'hillshade-exaggeration': 0.8
        }
      }, 'waterway-label');

      // Add 3D building layer
      const layers = map.current.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
      )?.id;

      map.current.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }
        },
        labelLayerId
      );
    });

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
      
      // Only add marker for Chadwick School
      const chadwickSchool = schoolData.find(school => school.name === 'Chadwick School');
      
      if (chadwickSchool) {
        new mapboxgl.Marker({ color: '#f59e0b' })
          .setLngLat([chadwickSchool.longitude, chadwickSchool.latitude])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<div><strong>${chadwickSchool.name}</strong><br/>${chadwickSchool.address}</div>`
            )
          )
          .addTo(map.current!);
      }

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
  }, [userLocation, pickupLocation, dropoffLocation, routeGeometry, mapboxToken, mapStyle, initialZoom, terrainEnabled]);

  const changeMapStyle = (newStyle: 'streets' | 'satellite' | 'hybrid') => {
    setMapStyle(newStyle);
  };

  const toggleTerrain = () => {
    if (!map.current) return;
    
    const newTerrainState = !terrainEnabled;
    setTerrainEnabled(newTerrainState);
    
    if (newTerrainState) {
      map.current.setTerrain({ 
        source: 'mapbox-dem', 
        exaggeration: 1.5 
      });
      if (map.current.getLayer('hillshade')) {
        map.current.setLayoutProperty('hillshade', 'visibility', 'visible');
      }
    } else {
      map.current.setTerrain(null);
      if (map.current.getLayer('hillshade')) {
        map.current.setLayoutProperty('hillshade', 'visibility', 'none');
      }
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
    <div className="relative w-full" style={{ height }}>
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg overflow-hidden border border-border"
      />
      
      {/* Map style controls */}
      {showStyleControls && (
        <div className="absolute top-4 left-4 z-10">
          {/* Toggle button - always visible */}
          <button
            onClick={() => setControlsExpanded(!controlsExpanded)}
            className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2 hover:bg-muted transition-colors mb-2"
            aria-label="Toggle map controls"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${controlsExpanded ? 'rotate-180' : ''}`}
            >
              <path d="M3 12h18" />
              <path d="M3 6h18" />
              <path d="M3 18h18" />
            </svg>
          </button>

          {/* Collapsible controls panel */}
          {controlsExpanded && (
            <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2 space-y-1 animate-in slide-in-from-left-2">
              <div className="space-y-1 pb-2 border-b border-border">
                <button
                  onClick={() => changeMapStyle('streets')}
                  className={`w-full px-3 py-2 text-sm rounded transition-colors ${
                    mapStyle === 'streets'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  Streets
                </button>
                <button
                  onClick={() => changeMapStyle('satellite')}
                  className={`w-full px-3 py-2 text-sm rounded transition-colors ${
                    mapStyle === 'satellite'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  Satellite
                </button>
                <button
                  onClick={() => changeMapStyle('hybrid')}
                  className={`w-full px-3 py-2 text-sm rounded transition-colors ${
                    mapStyle === 'hybrid'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  Hybrid
                </button>
              </div>
              <button
                onClick={toggleTerrain}
                className={`w-full px-3 py-2 text-sm rounded transition-colors ${
                  terrainEnabled
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {terrainEnabled ? '3D Terrain ✓' : '3D Terrain'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapView;
