import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// Rate limiting - 5 requests per hour per email
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
const RATE_LIMIT_MAX = 5; // 5 requests per hour per email

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    if (isRateLimited(email)) {
      console.log(`Rate limit exceeded for email: ${email}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Too many verification requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate 6-digit code using cryptographically secure random
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    const randomNumber = (randomBytes[0] << 24 | randomBytes[1] << 16 | randomBytes[2] << 8 | randomBytes[3]) >>> 0;
    const code = String(100000 + (randomNumber % 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes (reduced from 10)

    const normalizedEmail = email.toLowerCase();

    // Invalidate all previous unused codes for this email to prevent brute-force on old codes
    const { error: invalidateError } = await supabase
      .from('verification_codes')
      .update({ is_used: true })
      .eq('email', normalizedEmail)
      .eq('is_used', false);

    if (invalidateError) {
      console.error('Error invalidating old codes:', invalidateError);
      // Continue anyway - not critical
    }

    // Store new code in database
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to store verification code');
    }

    // Send email using Resend API directly
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      throw new Error('Resend API key not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Chadwick SchoolPool <noreply@chadwickschoolpool.org>',
        to: [email],
        subject: 'Your SchoolPool Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to SchoolPool!</h1>
            <p style="font-size: 16px; color: #666;">Your verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
            </div>
            <p style="font-size: 14px; color: #999;">This code will expire in 5 minutes.</p>
            <p style="font-size: 14px; color: #999;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const emailErrorText = await emailResponse.text();
      console.error('Email error:', emailErrorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verification code sent to ${email}`);

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
