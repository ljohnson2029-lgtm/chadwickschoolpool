import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { parentId } = await req.json();
    
    if (!parentId) {
      return new Response(
        JSON.stringify({ error: "Parent ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profile data
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, home_address, phone_number, created_at, account_type, grade_level, share_phone, share_email, car_make, car_model, car_color, license_plate")
      .eq("id", parentId)
      .eq("account_type", "parent")
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Parent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user email
    const { data: userData } = await supabase
      .from("users")
      .select("email")
      .eq("user_id", parentId)
      .single();

    // Fetch children from the children table (parent's profile children)
    const { data: childrenData } = await supabase
      .from("children")
      .select("first_name, last_name, grade_level")
      .eq("user_id", parentId);

    const linkedStudents = (childrenData || []).map(c => ({
      first_name: c.first_name || "Unknown",
      last_name: c.last_name || "",
      grade_level: c.grade_level,
    }));

    return new Response(
      JSON.stringify({
        profile: {
          ...profileData,
          email: userData?.email || null,
          linked_students_count: linkedStudents.length,
          linked_students: linkedStudents,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-parent-profile function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
