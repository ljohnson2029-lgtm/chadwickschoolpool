import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { usernameOrEmail, password } = await req.json();

    if (!usernameOrEmail || !password) {
      return new Response(
        JSON.stringify({ error: 'Username/email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input to prevent filter injection attacks
    // Allow: letters, numbers, @, ., _, -, spaces (for usernames/emails only)
    const sanitizedInput = String(usernameOrEmail).trim();
    const validInputPattern = /^[a-zA-Z0-9@._\-\s]+$/;
    if (!validInputPattern.test(sanitizedInput) || sanitizedInput.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Invalid username/email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find user by username or email using separate queries to prevent filter injection
    // First try username match
    let user = null;
    const { data: usernameUsers, error: usernameError } = await supabase
      .from('users')
      .select('*')
      .ilike('username', sanitizedInput)
      .limit(1);

    if (usernameError) {
      console.error('Database query error:', usernameError);
      return new Response(
        JSON.stringify({ error: 'Database error occurred' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (usernameUsers && usernameUsers.length > 0) {
      user = usernameUsers[0];
    } else {
      // If no username match, try email match (case-insensitive)
      const { data: emailUsers, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', sanitizedInput.toLowerCase())
        .limit(1);

      if (emailError) {
        console.error('Database query error:', emailError);
        return new Response(
          JSON.stringify({ error: 'Database error occurred' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      user = emailUsers && emailUsers.length > 0 ? emailUsers[0] : null;
    }


    if (!user) {
      console.log('User not found for:', usernameOrEmail);
      return new Response(
        JSON.stringify({ error: 'Invalid username/email or password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limiting
    if (user.failed_login_attempts >= 5 && 
        user.last_failed_login && 
        new Date(user.last_failed_login).getTime() > Date.now() - 3600000) { // 1 hour
      return new Response(
        JSON.stringify({ error: 'Too many failed attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password (using compareSync to avoid Worker issues in Edge Functions)
    const passwordMatch = bcrypt.compareSync(password, user.password_hash);

    if (!passwordMatch) {
      // Update failed login attempts
      await supabase
        .from('users')
        .update({ 
          failed_login_attempts: user.failed_login_attempts + 1,
          last_failed_login: new Date().toISOString()
        })
        .eq('user_id', user.user_id);

      return new Response(
        JSON.stringify({ error: 'Invalid username/email or password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset failed attempts and update last login
    await supabase
      .from('users')
      .update({ 
        failed_login_attempts: 0,
        last_login: new Date().toISOString()
      })
      .eq('user_id', user.user_id);

    // Return user data (excluding password)
    const { password_hash, ...userData } = user;

    console.log(`User ${user.username} logged in successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData 
      }),
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