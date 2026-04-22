import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const TARGET_EMAILS = [
  'sdesai2029@chadwickschool.org',
  'hlupo2029@chadwickschool.org',
  'jsamulski2029@chadwickschool.org',
  'lshope@chadwickschool.org',
  'gfoy2029@chadwickschool.org',
  'nabraham2029@chadwickschool.org',
  'jlagnese2029@chadwickschool.org',
];

Deno.serve(async (req) => {
  const pre = handleCorsPreflightIfNeeded(req);
  if (pre) return pre;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const results: Array<{ email: string; status: string; error?: string }> = [];

    // Paginate through auth users to find target IDs
    const targetSet = new Set(TARGET_EMAILS.map((e) => e.toLowerCase()));
    let page = 1;
    const perPage = 1000;
    const found: Array<{ id: string; email: string }> = [];
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      for (const u of data.users) {
        if (u.email && targetSet.has(u.email.toLowerCase())) {
          found.push({ id: u.id, email: u.email });
        }
      }
      if (data.users.length < perPage) break;
      page++;
    }

    for (const u of found) {
      const { error } = await supabase.auth.admin.deleteUser(u.id);
      if (error) results.push({ email: u.email, status: 'error', error: error.message });
      else results.push({ email: u.email, status: 'deleted' });
    }

    const notFound = TARGET_EMAILS.filter(
      (e) => !found.some((f) => f.email.toLowerCase() === e.toLowerCase()),
    );
    for (const e of notFound) results.push({ email: e, status: 'not_found' });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
