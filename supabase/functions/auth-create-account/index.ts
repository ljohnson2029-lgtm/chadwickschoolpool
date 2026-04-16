import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, username, password, firstName, lastName, phoneNumber } = await req.json();
    
    console.log(`Registration attempt for email: ${email}`);

    // Validate required fields
    if (!email || !username || !password || !firstName || !lastName) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'All required fields must be provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate username - allow letters, numbers, spaces, hyphens, and underscores
    if (username.length < 3 || username.length > 30) {
      console.error(`Invalid username length: ${username}`);
      return new Response(
        JSON.stringify({ error: 'Username must be 3-30 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/^[a-zA-Z0-9\s_-]+$/.test(username)) {
      console.error(`Invalid username characters: ${username}`);
      return new Response(
        JSON.stringify({ error: 'Username can only contain letters, numbers, spaces, hyphens, and underscores' }),
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

    const normalizedEmail = email.toLowerCase();

    // Check if email is banned
    const { data: bannedEmail } = await supabase
      .from('banned_emails')
      .select('email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (bannedEmail) {
      console.log(`Banned email attempted registration: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: 'This email is not approved for registration. Please contact an administrator.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isChadwickEmail = normalizedEmail.endsWith('@chadwickschool.org');

    // Check parent whitelist
    const { data: whitelistEntry, error: whitelistError } = await supabase
      .from('parent_email_whitelist')
      .select('email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (whitelistError) {
      console.error('Error checking whitelist:', whitelistError);
    }

    const isWhitelistedParent = !!whitelistEntry;

    // ACCESS GATE:
    // @chadwickschool.org + in whitelist = Parent (allowed)
    // @chadwickschool.org + NOT in whitelist = Student (allowed)
    // Non-chadwick + in whitelist = Parent (allowed)
    // Non-chadwick + NOT in whitelist = DENIED
    if (!isChadwickEmail && !isWhitelistedParent) {
      console.log(`Non-chadwick email not in parent whitelist, denying: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: 'This email is not recognized. Please use your Chadwick School email or contact your school administrator.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine account type
    let role: string;
    let accountType: string;

    if (isWhitelistedParent) {
      // In whitelist = ALWAYS parent (regardless of email domain)
      console.log(`Email ${normalizedEmail} found in parent whitelist - assigning parent role`);
      role = 'parent';
      accountType = 'parent';
    } else {
      // @chadwickschool.org + NOT in whitelist = student
      console.log(`Email ${normalizedEmail} is @chadwickschool.org and not in whitelist - assigning student role`);
      role = 'student';
      accountType = 'student';
    }

    // Check if username already exists (case-insensitive)
    const { data: existingUsername, error: usernameCheckError } = await supabase
      .from('users')
      .select('username')
      .ilike('username', username)
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
      .select('user_id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (emailCheckError) {
      console.error('Error checking email:', emailCheckError);
    }

    if (existingEmail) {
      console.log(`Found existing email in users table: ${email}, checking if orphaned...`);
      
      // Check if this user exists in Supabase Auth
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing auth users:', listError);
      } else {
        const authUserExists = authUsers?.users?.some(u => u.id === existingEmail.user_id);
        
        if (!authUserExists) {
          // This is an orphaned entry in users table (no corresponding auth user)
          console.log(`Found orphaned users table entry for ${email}, cleaning up...`);
          
          // Clean up orphaned data
          const { error: deleteUserError } = await supabase
            .from('users')
            .delete()
            .eq('user_id', existingEmail.user_id);
          
          if (deleteUserError) {
            console.error(`Failed to delete orphaned user: ${deleteUserError.message}`);
          } else {
            console.log(`Successfully cleaned up orphaned users table entry for ${email}`);
          }
          
          // Also clean up profile if exists
          const { error: deleteProfileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', existingEmail.user_id);
          
          if (deleteProfileError) {
            console.log(`Profile cleanup note: ${deleteProfileError.message}`);
          }
          
          // Also clean up user_roles if exists
          const { error: deleteRoleError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', existingEmail.user_id);
          
          if (deleteRoleError) {
            console.log(`Role cleanup note: ${deleteRoleError.message}`);
          }
          
          console.log(`Orphaned data cleaned up for ${email}, proceeding with registration...`);
        } else {
          // Email is truly registered with a valid auth user
          console.log(`Email already registered with valid auth user: ${email}`);
          return new Response(
            JSON.stringify({ error: 'Email already registered. Please try logging in instead.' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
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
    
    const authUserExists = existingAuthUser?.users?.some(u => u.email?.toLowerCase() === normalizedEmail);

    if (authUserExists) {
      // Clean up orphaned auth user (exists in auth but not in users table)
      const orphanedUser = existingAuthUser.users.find(u => u.email?.toLowerCase() === normalizedEmail);
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
      email: normalizedEmail,
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
        email: normalizedEmail,
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
        accountType: accountType,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in account creation:', error);
    console.error('Error details:', JSON.stringify(error));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
