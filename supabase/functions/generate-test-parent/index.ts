import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestParentRequest {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  password: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, address, password }: TestParentRequest = await req.json();

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log(`Test parent ${email} already exists, skipping...`);
      return new Response(
        JSON.stringify({ message: 'User already exists', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Geocode the address using Mapbox
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    if (!mapboxToken) {
      throw new Error('MAPBOX_PUBLIC_TOKEN not configured');
    }

    const encodedAddress = encodeURIComponent(address);
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    let latitude = null;
    let longitude = null;
    let formattedAddress = address;

    if (geocodeData.features && geocodeData.features.length > 0) {
      [longitude, latitude] = geocodeData.features[0].center;
      formattedAddress = geocodeData.features[0].place_name;
    }

    // Generate random phone number
    const randomPhone = `(310) 555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // Create username from email
    const username = email.split('@')[0];

    // Hash password using bcrypt (imported from Deno)
    const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
    const passwordHash = await bcrypt.hash(password);

    // Create user in custom users table
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        username,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone_number: randomPhone,
        is_verified: true,
      })
      .select('user_id')
      .single();

    if (userError) throw userError;

    // Create profile
    await supabase.from('profiles').insert({
      id: newUser.user_id,
      username,
      first_name: firstName,
      last_name: lastName,
      phone_number: randomPhone,
      home_address: formattedAddress,
      home_latitude: latitude,
      home_longitude: longitude,
      account_type: 'parent',
      car_make: ['Honda', 'Toyota', 'Tesla', 'Ford', 'BMW'][Math.floor(Math.random() * 5)],
      car_model: ['Accord', 'Camry', 'Model 3', 'Explorer', 'X5'][Math.floor(Math.random() * 5)],
      car_seats: Math.floor(Math.random() * 3) + 3, // 3-5 seats
    });

    // Assign parent role
    await supabase.from('user_roles').insert({
      user_id: newUser.user_id,
      role: 'parent',
    });

    console.log(`Successfully created test parent: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created test parent: ${firstName} ${lastName}`,
        email,
        coordinates: { latitude, longitude }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating test parent:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
