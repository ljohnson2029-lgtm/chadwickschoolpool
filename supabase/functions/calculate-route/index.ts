import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

interface RouteRequest {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
}

interface RouteResponse {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: any; // GeoJSON LineString
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the JWT token and verify with service role
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { origin, destination }: RouteRequest = await req.json();
    console.log('Calculating route for user:', user.id, 'from', origin, 'to', destination);

    if (!origin || !destination || !origin.latitude || !origin.longitude || 
        !destination.latitude || !destination.longitude) {
      return new Response(
        JSON.stringify({ error: 'Origin and destination coordinates are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate coordinate ranges
    if (Math.abs(origin.latitude) > 90 || Math.abs(destination.latitude) > 90 ||
        Math.abs(origin.longitude) > 180 || Math.abs(destination.longitude) > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    if (!mapboxToken) {
      console.error('MAPBOX_PUBLIC_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Mapping service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Mapbox Directions API
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${mapboxToken}`;

    console.log('Calling Mapbox Directions API');
    const response = await fetch(directionsUrl);
    
    if (!response.ok) {
      console.error('Mapbox API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to calculate route' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      console.log('No routes found');
      return new Response(
        JSON.stringify({ error: 'No route found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const route = data.routes[0];

    const result: RouteResponse = {
      distance: route.distance, // meters
      duration: route.duration, // seconds
      geometry: route.geometry
    };

    console.log('Route calculated:', { 
      distance: `${(result.distance / 1000).toFixed(2)} km`, 
      duration: `${(result.duration / 60).toFixed(1)} min` 
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-route function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
