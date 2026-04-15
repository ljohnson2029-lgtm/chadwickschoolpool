import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// Simple in-memory rate limiting (per IP, resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  record.count++;
  if (record.count > RATE_LIMIT_MAX) {
    return true;
  }
  
  return false;
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check rate limit
    if (isRateLimited(clientIP)) {
      console.log('Rate limited IP:', clientIP);
      return new Response(
        JSON.stringify({ approved: false, message: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ approved: false, message: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ approved: false, message: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is banned
    const { data: bannedEmail } = await supabase
      .from('banned_emails')
      .select('email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (bannedEmail) {
      console.log(`Banned email check attempt: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ approved: false, message: 'This email is not approved for registration. Please contact an administrator.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already has an account (duplicate check)
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('user_id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing user:', existingError);
    }

    if (existingUser) {
      console.log(`Email already registered: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ approved: false, exists: true, message: 'An account with this email already exists. Please log in instead.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is in parent whitelist (overrides student detection)
    const { data: whitelistData } = await supabase
      .from('parent_email_whitelist')
      .select('email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    const isWhitelistedParent = !!whitelistData;

    // Check if it's a Chadwick School email
    if (normalizedEmail.endsWith('@chadwickschool.org')) {
      const isStudent = !isWhitelistedParent;
      console.log(`Approved Chadwick email: ${normalizedEmail}, isStudent: ${isStudent}`);
      return new Response(
        JSON.stringify({ approved: true, reason: 'Chadwick School email', isStudent }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check approved_emails table
    const { data, error } = await supabase
      .from('approved_emails')
      .select('email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to check email approval');
    }

    if (data) {
      console.log(`Approved email from database: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ approved: true, reason: 'Email in approved list', isStudent: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Email not approved: ${normalizedEmail}`);
    return new Response(
      JSON.stringify({ 
        approved: false, 
        message: 'This email is not approved for registration. Please contact an administrator.' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ approved: false, message: 'Unable to verify email at this time' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
