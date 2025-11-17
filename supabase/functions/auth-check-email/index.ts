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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ approved: false, message: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const normalizedEmail = email.toLowerCase();

    // Check if it's a Chadwick School email
    if (normalizedEmail.endsWith('@chadwickschool.org')) {
      console.log(`Approved Chadwick email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ approved: true, reason: 'Chadwick School email' }),
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
        JSON.stringify({ approved: true, reason: 'Email in approved list' }),
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
      JSON.stringify({ approved: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});