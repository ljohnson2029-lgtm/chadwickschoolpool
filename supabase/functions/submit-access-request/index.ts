import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 3600000 });
    return false;
  }
  record.count++;
  return record.count > 5;
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIP)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, full_name, requester_type: user_type, reason } = await req.json();

    // Validate
    if (!email || !full_name || !user_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (full_name.length > 100 || (reason && reason.length > 500)) {
      return new Response(JSON.stringify({ error: "Input too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["parent", "student"].includes(user_type)) {
      return new Response(JSON.stringify({ error: "Invalid user type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to insert
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for duplicate pending request
    const { data: existing } = await supabase
      .from("access_requests")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "A request with this email is already pending." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabase.from("access_requests").insert({
      email: email.toLowerCase().trim(),
      full_name: full_name.trim(),
      user_type,
      reason: reason?.trim() || null,
    });

    if (insertError) throw insertError;

    // Send notification email to admins
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const escapeHtml = (t: string) => t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const adminEmails = ["luke.r.johnson.2010@gmail.com", "efang508@gmail.com"];
      const typeLabel = user_type === "parent" ? "Chadwick Parent" : "Chadwick Student";

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Chadwick SchoolPool <noreply@chadwickschoolpool.org>",
          to: adminEmails,
          subject: `New Access Request from ${full_name.trim()}`,
          html: `
            <h2>New SchoolPool Access Request</h2>
            <p><strong>Name:</strong> ${escapeHtml(full_name.trim())}</p>
            <p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>
            <p><strong>Type:</strong> ${typeLabel}</p>
            ${reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason.trim())}</p>` : ""}
            <p><em>Log in to the admin panel to approve or deny this request.</em></p>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Unable to process request" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
