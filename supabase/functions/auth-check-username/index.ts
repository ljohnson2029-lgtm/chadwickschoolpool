import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// Simple in-memory rate limiting (per IP, resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 15; // 15 requests per minute per IP

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
        JSON.stringify({ available: false, reason: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { username } = await req.json();

    if (!username || typeof username !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clean = username.trim();

    // Basic validation - allow alphanumeric, spaces, hyphens, and underscores
    if (clean.length < 3 || clean.length > 30) {
      return new Response(
        JSON.stringify({ available: false, reason: 'Username must be 3-30 characters' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Allow alphanumeric, spaces, hyphens, and underscores
    if (!/^[a-zA-Z0-9\s_-]+$/.test(clean)) {
      return new Response(
        JSON.stringify({ available: false, reason: 'Username can only contain letters, numbers, spaces, hyphens, and underscores' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking username availability for:', clean);

    // Check case-insensitive to avoid duplicates like "John" and "john"
    const { data: existing, error: queryError } = await supabase
      .from('users')
      .select('username')
      .ilike('username', clean)
      .maybeSingle();

    if (queryError) {
      console.error('Database query error:', queryError);
      return new Response(
        JSON.stringify({ available: false, reason: 'Unable to check username at this time' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Query result - existing username:', existing);
    console.log('Username available:', !existing);

    const available = !existing;

    return new Response(
      JSON.stringify({ available }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('auth-check-username error:', error);
    return new Response(
      JSON.stringify({ error: 'Unable to check username at this time' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
