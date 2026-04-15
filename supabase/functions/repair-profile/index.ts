import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await authedClient.auth.getUser();

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = authData.user;

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile) {
      return new Response(JSON.stringify({ profile: existingProfile }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRows, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roleError) {
      throw roleError;
    }

    const roles = (roleRows ?? []).map((row) => row.role);
    const accountType = roles.includes("parent")
      ? "parent"
      : roles.includes("student")
        ? "student"
        : user.email?.toLowerCase().endsWith("@chadwickschool.org")
          ? "student"
          : "parent";

    const metadataUsername = user.user_metadata?.username;
    const username = typeof metadataUsername === "string" && metadataUsername.trim()
      ? metadataUsername.trim()
      : user.email?.split("@")[0]?.trim() || `user-${user.id.slice(0, 8)}`;

    const firstName = typeof user.user_metadata?.first_name === "string"
      ? user.user_metadata.first_name.trim() || null
      : null;

    const lastName = typeof user.user_metadata?.last_name === "string"
      ? user.user_metadata.last_name.trim() || null
      : null;

    const { data: repairedProfile, error: upsertError } = await adminClient
      .from("profiles")
      .upsert({
        id: user.id,
        username,
        first_name: firstName,
        last_name: lastName,
        phone_number: null,
        account_type: accountType,
        profile_complete: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      .select("*")
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return new Response(JSON.stringify({ profile: repairedProfile }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});