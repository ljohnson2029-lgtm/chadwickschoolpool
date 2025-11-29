import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all test parent user_ids
    const { data: testParents, error: fetchError } = await supabase
      .from('users')
      .select('user_id')
      .like('email', '%@example.com');

    if (fetchError) throw fetchError;

    if (!testParents || testParents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No test parents found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIds = testParents.map(p => p.user_id);
    console.log(`Deleting ${userIds.length} test parent accounts...`);

    // Delete in reverse order of foreign key dependencies
    
    // 1. Delete notifications
    await supabase.from('notifications').delete().in('user_id', userIds);

    // 2. Delete rides
    await supabase.from('rides').delete().in('user_id', userIds);

    // 3. Delete account links
    await supabase.from('account_links').delete().in('student_id', userIds);
    await supabase.from('account_links').delete().in('parent_id', userIds);

    // 4. Delete student-parent links
    await supabase.from('student_parent_links').delete().in('student_id', userIds);
    await supabase.from('student_parent_links').delete().in('parent_id', userIds);

    // 5. Delete co-parent links
    await supabase.from('co_parent_links').delete().in('requester_id', userIds);
    await supabase.from('co_parent_links').delete().in('recipient_id', userIds);

    // 6. Delete user roles
    await supabase.from('user_roles').delete().in('user_id', userIds);

    // 7. Delete profiles
    await supabase.from('profiles').delete().in('id', userIds);

    // 8. Finally delete users
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .like('email', '%@example.com');

    if (deleteError) throw deleteError;

    console.log(`Successfully deleted ${userIds.length} test parent accounts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Deleted ${userIds.length} test parent accounts`,
        count: userIds.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting test parents:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
