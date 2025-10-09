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
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the most recent non-used code for this email
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'No verification code found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code has expired
    if (new Date(data.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Verification code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check attempts
    if (data.attempts >= 3) {
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify code
    if (data.code !== code) {
      // Increment attempts
      await supabase
        .from('verification_codes')
        .update({ attempts: data.attempts + 1 })
        .eq('id', data.id);

      return new Response(
        JSON.stringify({ 
          error: 'Invalid verification code', 
          attemptsRemaining: 3 - (data.attempts + 1) 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark code as used
    await supabase
      .from('verification_codes')
      .update({ is_used: true })
      .eq('id', data.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Code verified successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});