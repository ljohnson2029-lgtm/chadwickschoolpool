import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database
    const { error: dbError } = await supabase
      .from('verification_codes')
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: 'SchoolPool <onboarding@resend.dev>',
      to: [email],
      subject: 'Your SchoolPool Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px; margin: 20px 0; }
              .footer { margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Welcome to SchoolPool!</h1>
              <p>To complete your registration, please enter this verification code:</p>
              <div class="code">${code}</div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you did not request this code, please ignore this email.</p>
              <div class="footer">
                <p>Best regards,<br>The SchoolPool Team</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('Email error:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send verification email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verification code sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Verification code sent successfully' }),
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