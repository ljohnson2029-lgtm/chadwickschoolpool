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
    const { email, username, password, firstName, lastName, phoneNumber, userType } = await req.json();
    
    console.log(`Registration attempt for email: ${email}`);

    // Validate required fields
    if (!email || !username || !password || !firstName || !lastName) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'All required fields must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate username
    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9]+$/.test(username)) {
      console.error(`Invalid username format: ${username}`);
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
      console.error('Password does not meet requirements');
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
    const { data: existingUsername, error: usernameCheckError } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (usernameCheckError) {
      console.error('Error checking username:', usernameCheckError);
    }

    if (existingUsername) {
      console.log(`Username already exists: ${username}`);
      return new Response(
        JSON.stringify({ error: 'Username already taken' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists in custom users table
    const { data: existingEmail, error: emailCheckError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (emailCheckError) {
      console.error('Error checking email:', emailCheckError);
    }

    if (existingEmail) {
      console.log(`Email already registered: ${email}`);
      return new Response(
        JSON.stringify({ error: 'Email already registered' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists in Supabase Auth
    const { data: existingAuthUser, error: listUsersError } = await supabase.auth.admin.listUsers();
    
    if (listUsersError) {
      console.error('Error listing auth users:', listUsersError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify account status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authUserExists = existingAuthUser?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (authUserExists) {
      // Clean up orphaned auth user (exists in auth but not in users table)
      const orphanedUser = existingAuthUser.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (orphanedUser) {
        console.log(`Found orphaned auth user for ${email}, cleaning up`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(orphanedUser.id);
        if (deleteError) {
          console.error(`Failed to delete orphaned user: ${deleteError.message}`);
        } else {
          console.log(`Successfully cleaned up orphaned auth user for ${email}`);
        }
      }
    }

    // Hash password (using hashSync to avoid Worker issues in Edge Functions)
    console.log('Hashing password...');
    const passwordHash = bcrypt.hashSync(password);

    // Create Supabase Auth user
    console.log('Creating Supabase auth user...');
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
      console.error('Auth error details:', JSON.stringify(authError));
      return new Response(
        JSON.stringify({ error: `Failed to create auth account: ${authError.message || 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Auth user created successfully with ID: ${authData.user.id}`);

    // Create user in custom users table
    console.log('Creating user record in database...');
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
      console.error('Database error details:', JSON.stringify(createError));
      // Rollback: delete the auth user if database insert fails
      console.log('Rolling back auth user creation...');
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create user record: ${createError.message || 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User record created successfully');

    // Determine and assign user role and account type
    const normalizedEmail = email.toLowerCase();
    let role = 'parent'; // Default role
    let accountType = 'parent'; // Default account type
    
    // Exempt parent accounts (staff/faculty with @chadwickschool.org emails)
    const parentExemptions = ['ljohnson2029@chadwickschool.org'];
    
    if (parentExemptions.includes(normalizedEmail)) {
      role = 'parent';
      accountType = 'parent';
    } else if (normalizedEmail.endsWith('@chadwickschool.org')) {
      role = 'student';
      accountType = 'student';
    } else if (userType) {
      // If userType is provided (parent/staff), use it
      role = userType;
      accountType = 'parent'; // Non-chadwick emails are always parents
    }

    // Create profile record with account_type
    console.log('Creating profile record...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || null,
        account_type: accountType,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      console.error('Profile error details:', JSON.stringify(profileError));
      // Continue anyway - profile can be created later
    } else {
      console.log('Profile record created successfully');
    }

    // Create user role
    console.log('Creating user role...');
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: role,
      });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      console.error('Role error details:', JSON.stringify(roleError));
      // Continue anyway - role can be assigned later
    } else {
      console.log('User role created successfully');
    }

    console.log(`Account created for ${email} with role: ${role}, account_type: ${accountType}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account created successfully',
        userId: newUser.user_id,
        role: role,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error in account creation:', error);
    console.error('Error details:', JSON.stringify(error));
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});