import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, username, password, firstName, lastName, phoneNumber } = await req.json();

    // Validate required fields
    if (!email || !username || !password || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: 'All required fields must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate username
    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9]+$/.test(username)) {
      return new Response(
        JSON.stringify({ error: 'Username must be 3-20 alphanumeric characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password
    if (password.length < 8 || 
        !/[A-Z]/.test(password) || 
        !/[a-z]/.test(password) || 
        !/[0-9]/.test(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters with uppercase, lowercase, and number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      return new Response(
        JSON.stringify({ error: 'Username already taken' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingEmail) {
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash password (using hashSync to avoid Worker issues in Edge Functions)
    const passwordHash = bcrypt.hashSync(password);

    // Create Supabase Auth user first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm since we already did 2FA verification
      user_metadata: {
        username,
        first_name: firstName,
        last_name: lastName,
      }
    });

    if (authError) {
      console.error('Supabase auth creation error:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to create auth account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user in custom users table
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        user_id: authData.user.id, // Use the same ID as Supabase Auth
        email: email.toLowerCase(),
        username,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || null,
        is_verified: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Database error:', createError);
      // Rollback: delete the auth user if database insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || null,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Continue anyway - profile can be created later
    }

    console.log(`Account created for ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account created successfully',
        userId: newUser.user_id 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});