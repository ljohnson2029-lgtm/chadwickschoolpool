import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const ADMIN_EMAILS = ["luke.r.johnson.2010@gmail.com", "efang508@gmail.com"];

async function getAuthenticatedEmail(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  // Look up the user's email from the users table
  const { data: userData } = await supabase
    .from("users")
    .select("email")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return userData?.email?.toLowerCase() || null;
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;
  const corsHeaders = getCorsHeaders(req);
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const email = await getAuthenticatedEmail(req);
    if (!email || !ADMIN_EMAILS.includes(email)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: jsonHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // GET = fetch pending requests
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("access_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ requests: data }), {
        status: 200, headers: jsonHeaders,
      });
    }

    // POST = approve or deny
    if (req.method === "POST") {
      const { request_id, action } = await req.json();

      if (!request_id || !["approve", "deny"].includes(action)) {
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400, headers: jsonHeaders,
        });
      }

      // Get the request
      const { data: request, error: fetchErr } = await supabase
        .from("access_requests")
        .select("*")
        .eq("id", request_id)
        .maybeSingle();

      if (fetchErr || !request) {
        return new Response(JSON.stringify({ error: "Request not found" }), {
          status: 404, headers: jsonHeaders,
        });
      }

      if (action === "approve") {
        // Add to approved_emails
        await supabase.from("approved_emails").upsert(
          { email: request.email, approved_by: email },
          { onConflict: "email" }
        );

        // Update request status
        await supabase
          .from("access_requests")
          .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: email })
          .eq("id", request_id);

        // Send approval email
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Chadwick SchoolPool <noreply@chadwickschoolpool.org>",
              to: [request.email],
              subject: "Your SchoolPool Access Has Been Approved!",
              html: `
                <h2>Welcome to SchoolPool!</h2>
                <p>Hi ${request.full_name},</p>
                <p>Your request to join Chadwick SchoolPool has been approved! You can now create your account.</p>
                <p><a href="https://chadwickschoolpool.lovable.app/register" style="display:inline-block;padding:12px 24px;background:#0072cc;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Create Your Account</a></p>
                <p>If the button doesn't work, copy this link: https://chadwickschoolpool.lovable.app/register</p>
              `,
            }),
          });
        }

        return new Response(JSON.stringify({ success: true, action: "approved" }), {
          status: 200, headers: jsonHeaders,
        });
      }

      if (action === "deny") {
        await supabase
          .from("access_requests")
          .update({ status: "denied", approved_by: email })
          .eq("id", request_id);

        return new Response(JSON.stringify({ success: true, action: "denied" }), {
          status: 200, headers: jsonHeaders,
        });
      }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: jsonHeaders,
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
