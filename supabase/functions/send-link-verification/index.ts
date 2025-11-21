import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  parentEmail: string;
  studentName: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { parentEmail, studentName, code }: VerificationEmailRequest = await req.json();

    console.log('Sending verification email to:', parentEmail);

    const emailResponse = await resend.emails.send({
      from: "SchoolPool <onboarding@resend.dev>",
      to: [parentEmail],
      subject: "Your child wants to connect on SchoolPool",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">SchoolPool Account Link Request</h1>
          <p>Your child <strong>${studentName}</strong> wants to link their SchoolPool account to yours.</p>
          
          <p>They will be able to <strong>VIEW</strong> rides you schedule, but cannot create or modify rides.</p>
          
          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
            <h2 style="margin: 10px 0; font-size: 32px; letter-spacing: 8px; color: #2563eb;">${code}</h2>
          </div>
          
          <p><strong>To approve:</strong></p>
          <ol>
            <li>Log into SchoolPool</li>
            <li>Go to Parent Approvals</li>
            <li>Enter this code: <strong>${code}</strong></li>
          </ol>
          
          <p style="color: #666; font-size: 14px;">Code expires in 7 days.</p>
          
          <p>If you didn't expect this request, you can safely ignore this email.</p>
          
          <p style="color: #666; margin-top: 40px;">
            Best regards,<br>
            The SchoolPool Team
          </p>
        </div>
      `,
    });

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
