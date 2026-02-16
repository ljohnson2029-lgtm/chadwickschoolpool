import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// Rate limiting - 10 verify requests per 5 minutes per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 300000; // 5 minutes in milliseconds
const RATE_LIMIT_MAX = 10; // 10 requests per 5 minutes per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }

  record.count++;
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
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Too many verification attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const normalizedEmail = email.toLowerCase().trim();
    const incomingCode = String(code).trim();

    // Try to match the exact code first (unused & not expired)
    const { data: exactVerification, error: exactFetchError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('code', incomingCode)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exactFetchError) {
      console.error('Database error (exact):', exactFetchError);
      throw new Error('Failed to verify code');
    }

    let verification = exactVerification;
    let isExactMatch = !!exactVerification;

    // Fallback to the most recent unused code (for attempts/expired logic)
    if (!verification) {
      const { data: latestVerification, error: fetchError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('is_used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Database error (latest):', fetchError);
        throw new Error('Failed to verify code');
      }

      verification = latestVerification;
    }


    if (!verification) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No verification code found. Please request a new code.',
          attemptsRemaining: 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code is expired
    if (new Date(verification.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Verification code has expired. Please request a new code.',
          attemptsRemaining: 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check attempts
    if (verification.attempts >= 3) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many failed attempts. Please request a new code.',
          attemptsRemaining: 0
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log attempt and decide based on exact match
    console.log('2FA verify attempt', {
      email,
      providedCode: incomingCode,
      expectedCode: String(verification.code).trim(),
      verificationId: verification.id,
      attempts: verification.attempts,
      created_at: verification.created_at,
      expires_at: verification.expires_at,
    });

    if (!isExactMatch) {
      // Increment attempts on the most recent code
      await supabase
        .from('verification_codes')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification.id);

      const remainingAttempts = 3 - (verification.attempts + 1);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid verification code',
          attemptsRemaining: Math.max(0, remainingAttempts),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark code as used
    await supabase
      .from('verification_codes')
      .update({ is_used: true })
      .eq('id', verification.id);

    console.log(`Code verified successfully for ${email}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
