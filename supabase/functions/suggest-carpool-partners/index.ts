import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

interface ScoredSuggestion {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  distance_miles: number;
  grade_matches: string[];
  schedule_overlap_days: string[];
  ride_count: number;
  score: number;
  reasons: string[];
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [
      { data: myProfile },
      { data: myChildren },
      { data: allParents },
      { data: allChildren },
      { data: allRides },
      { data: recurringSchedules },
      { data: existingSpaces },
    ] = await Promise.all([
      supabase.from("profiles").select("id, home_latitude, home_longitude, home_address").eq("id", user.id).single(),
      supabase.from("children").select("grade_level").eq("user_id", user.id),
      supabase.from("profiles").select("id, first_name, last_name, username, home_latitude, home_longitude, home_address, account_type")
        .eq("account_type", "parent").neq("id", user.id)
        .not("home_latitude", "is", null).not("home_longitude", "is", null),
      supabase.from("children").select("user_id, grade_level, first_name"),
      supabase.from("rides").select("user_id, recurring_days, ride_date, type")
        .eq("status", "active"),
      supabase.from("recurring_schedules").select("proposer_id, recipient_id, day_assignments, status")
        .eq("status", "accepted"),
      supabase.from("series_spaces").select("parent_a_id, parent_b_id")
        .or(`parent_a_id.eq.${user.id},parent_b_id.eq.${user.id}`),
    ]);

    if (!myProfile?.home_latitude || !myProfile?.home_longitude) {
      return new Response(JSON.stringify({ suggestions: [], reason: "no_address" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const myGrades = new Set((myChildren || []).map(c => c.grade_level).filter(Boolean));

    const childrenByParent: Record<string, { grade_level: string | null; first_name: string }[]> = {};
    for (const c of (allChildren || [])) {
      if (!childrenByParent[c.user_id]) childrenByParent[c.user_id] = [];
      childrenByParent[c.user_id].push({ grade_level: c.grade_level, first_name: c.first_name });
    }

    const rideCountByUser: Record<string, number> = {};
    const activeDaysByUser: Record<string, Set<string>> = {};
    for (const r of (allRides || [])) {
      rideCountByUser[r.user_id] = (rideCountByUser[r.user_id] || 0) + 1;
      if (!activeDaysByUser[r.user_id]) activeDaysByUser[r.user_id] = new Set();
      if (r.recurring_days) {
        for (const d of r.recurring_days) activeDaysByUser[r.user_id].add(d);
      }
      if (r.ride_date) {
        const dayName = new Date(r.ride_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
        activeDaysByUser[r.user_id].add(dayName);
      }
    }

    for (const s of (recurringSchedules || [])) {
      for (const uid of [s.proposer_id, s.recipient_id]) {
        if (!activeDaysByUser[uid]) activeDaysByUser[uid] = new Set();
        const assignments = s.day_assignments as Record<string, string> | null;
        if (assignments) {
          for (const day of Object.keys(assignments)) {
            activeDaysByUser[uid].add(day);
          }
        }
      }
      rideCountByUser[s.proposer_id] = (rideCountByUser[s.proposer_id] || 0) + 3;
      rideCountByUser[s.recipient_id] = (rideCountByUser[s.recipient_id] || 0) + 3;
    }

    const myDays = activeDaysByUser[user.id] || new Set();

    const existingPartners = new Set<string>();
    for (const sp of (existingSpaces || [])) {
      existingPartners.add(sp.parent_a_id === user.id ? sp.parent_b_id : sp.parent_a_id);
    }

    const W_DISTANCE = 40;
    const W_SCHEDULE = 25;
    const W_GRADE = 25;
    const W_ACTIVITY = 10;
    const MAX_DISTANCE = 10;

    const scored: ScoredSuggestion[] = [];

    for (const p of (allParents || [])) {
      if (existingPartners.has(p.id)) continue;

      const dist = haversine(myProfile.home_latitude, myProfile.home_longitude, p.home_latitude!, p.home_longitude!);
      if (dist > MAX_DISTANCE) continue;

      const reasons: string[] = [];

      const distScore = Math.max(0, 1 - (dist / MAX_DISTANCE));
      const distWeighted = distScore * W_DISTANCE;

      if (dist < 1) reasons.push(`Lives ${dist < 0.5 ? 'less than half a mile' : dist.toFixed(1) + ' mi'} away`);
      else if (dist < 3) reasons.push(`Lives ${dist.toFixed(1)} miles away`);

      const theirDays = activeDaysByUser[p.id] || new Set();
      const overlapDays: string[] = [];
      for (const d of myDays) {
        if (theirDays.has(d)) overlapDays.push(d);
      }
      const scheduleScore = myDays.size > 0 && theirDays.size > 0
        ? (overlapDays.length / Math.max(myDays.size, theirDays.size))
        : 0;
      const scheduleWeighted = scheduleScore * W_SCHEDULE;

      if (overlapDays.length > 0) {
        if (overlapDays.length >= 4) reasons.push("Carpools on most of the same days");
        else reasons.push(`Shares ${overlapDays.join(", ")} schedule`);
      }

      const theirChildren = childrenByParent[p.id] || [];
      const gradeMatches: string[] = [];
      for (const c of theirChildren) {
        if (c.grade_level && myGrades.has(c.grade_level)) {
          gradeMatches.push(c.grade_level);
        }
      }
      const gradeScore = myGrades.size > 0 && gradeMatches.length > 0
        ? Math.min(1, gradeMatches.length / myGrades.size)
        : 0;
      const gradeWeighted = gradeScore * W_GRADE;

      if (gradeMatches.length > 0) {
        const uniqueGrades = [...new Set(gradeMatches)];
        reasons.push(`Kids in ${uniqueGrades.join(", ")}`);
      }

      const rideCount = rideCountByUser[p.id] || 0;
      const activityScore = Math.min(1, rideCount / 10);
      const activityWeighted = activityScore * W_ACTIVITY;

      if (rideCount >= 5) reasons.push("Active carpooler");

      const totalScore = distWeighted + scheduleWeighted + gradeWeighted + activityWeighted;

      if (totalScore < 5 || reasons.length === 0) continue;

      scored.push({
        id: p.id,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        username: p.username,
        distance_miles: Math.round(dist * 10) / 10,
        grade_matches: [...new Set(gradeMatches)],
        schedule_overlap_days: overlapDays,
        ride_count: rideCount,
        score: Math.round(totalScore * 10) / 10,
        reasons,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const suggestions = scored.slice(0, 5);

    return new Response(JSON.stringify({ suggestions }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-carpool-partners:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
