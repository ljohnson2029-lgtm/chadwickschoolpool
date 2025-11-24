import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    if (!username || typeof username !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clean = username.trim();

    // Basic validation - allow alphanumeric, spaces, hyphens, and underscores
    if (clean.length < 3 || clean.length > 30) {
      return new Response(
        JSON.stringify({ available: false, reason: 'Username must be 3-30 characters' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Allow alphanumeric, spaces, hyphens, and underscores
    if (!/^[a-zA-Z0-9\s_-]+$/.test(clean)) {
      return new Response(
        JSON.stringify({ available: false, reason: 'Username can only contain letters, numbers, spaces, hyphens, and underscores' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking username availability for:', clean);

    // Check case-insensitive to avoid duplicates like "John" and "john"
    const { data: existing, error: queryError } = await supabase
      .from('users')
      .select('username')
      .ilike('username', clean)
      .maybeSingle();

    if (queryError) {
      console.error('Database query error:', queryError);
      return new Response(
        JSON.stringify({ available: false, reason: 'Database error occurred' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Query result - existing username:', existing);
    console.log('Username available:', !existing);

    const available = !existing;

    return new Response(
      JSON.stringify({ available }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('auth-check-username error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to check username' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
