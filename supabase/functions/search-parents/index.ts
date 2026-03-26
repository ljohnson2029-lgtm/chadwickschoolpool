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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchTerm = query.trim().toLowerCase();

    // Search parent profiles by name
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, username, account_type")
      .eq("account_type", "parent")
      .neq("id", user.id);

    // Search children by name
    const { data: children } = await supabase
      .from("children")
      .select("user_id, first_name, last_name, grade_level");

    // Build parent-to-children map
    const childrenByParent: Record<string, Array<{ first_name: string; last_name: string; grade_level: string | null }>> = {};
    if (children) {
      for (const child of children) {
        if (!childrenByParent[child.user_id]) childrenByParent[child.user_id] = [];
        childrenByParent[child.user_id].push({
          first_name: child.first_name || "",
          last_name: child.last_name || "",
          grade_level: child.grade_level,
        });
      }
    }

    // Match parents by their own name or their children's names
    const matchedParents: Array<{
      id: string;
      first_name: string;
      last_name: string;
      username: string;
      children: Array<{ first_name: string; last_name: string; grade_level: string | null }>;
    }> = [];

    if (profiles) {
      for (const p of profiles) {
        const parentName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
        const parentChildren = childrenByParent[p.id] || [];

        const parentNameMatch = parentName.includes(searchTerm);
        const childNameMatch = parentChildren.some((c) => {
          const childName = `${c.first_name} ${c.last_name}`.toLowerCase();
          return childName.includes(searchTerm);
        });

        if (parentNameMatch || childNameMatch) {
          matchedParents.push({
            id: p.id,
            first_name: p.first_name || "",
            last_name: p.last_name || "",
            username: p.username,
            children: parentChildren,
          });
        }
      }
    }

    // Limit to 10 results
    const results = matchedParents.slice(0, 10);

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in search-parents:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
