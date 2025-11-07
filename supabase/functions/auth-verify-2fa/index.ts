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