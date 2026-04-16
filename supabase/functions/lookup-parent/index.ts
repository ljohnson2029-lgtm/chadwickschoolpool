import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Authentication check - require valid JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the token using service role client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, expected_role } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Prevent self-linking
    const { data: callerData } = await supabase
      .from('users')
      .select('email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (callerData && callerData.email.toLowerCase() === normalizedEmail) {
      return new Response(
        JSON.stringify({ found: false, message: 'You cannot link to your own account' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, email, first_name, last_name')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userError) {
      console.error('Error looking up user:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to lookup user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData) {
      console.log(`No user found for email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ found: false, message: "No account found with this email. Make sure they've signed up first." }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found user: ${userData.user_id} for email: ${normalizedEmail}`);

    // Determine the expected role to validate
    // If expected_role is provided, use it; otherwise default to 'parent' for backward compatibility
    const roleToCheck = expected_role || 'parent';

    // Check if user has the expected role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user_id)
      .eq('role', roleToCheck)
      .maybeSingle();

    if (roleError) {
      console.error('Error checking role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify account type' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleData) {
      const roleLabel = roleToCheck === 'parent' ? 'parent' : 'student';
      console.log(`User ${userData.user_id} does not have role: ${roleToCheck}`);
      return new Response(
        JSON.stringify({ found: false, message: `This account is not registered as a ${roleLabel}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ found: true, user_id: userData.user_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('lookup-parent error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
