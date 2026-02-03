import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].slice(0, 5);

    console.log(`Cleaning up rides before ${currentDate} ${currentTime}`);

    // First, mark expired rides as 'expired' (for rides where date has passed)
    const { data: expiredByDate, error: expireError } = await supabase
      .from('rides')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('ride_date', currentDate)
      .select('id');

    if (expireError) {
      console.error('Error expiring rides by date:', expireError);
    } else {
      console.log(`Marked ${expiredByDate?.length || 0} rides as expired (past date)`);
    }

    // Also mark rides as expired if the date is today but time has passed
    const { data: expiredByTime, error: expireTimeError } = await supabase
      .from('rides')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .eq('ride_date', currentDate)
      .lt('ride_time', currentTime)
      .select('id');

    if (expireTimeError) {
      console.error('Error expiring rides by time:', expireTimeError);
    } else {
      console.log(`Marked ${expiredByTime?.length || 0} rides as expired (past time today)`);
    }

    // Delete rides that have been expired for more than 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoDate = sevenDaysAgo.toISOString().split('T')[0];

    const { data: deletedRides, error: deleteError } = await supabase
      .from('rides')
      .delete()
      .eq('status', 'expired')
      .lt('ride_date', sevenDaysAgoDate)
      .select('id');

    if (deleteError) {
      console.error('Error deleting old expired rides:', deleteError);
    } else {
      console.log(`Deleted ${deletedRides?.length || 0} old expired rides`);
    }

    // DATA RETENTION: Delete private ride requests older than 90 days
    // This protects user location privacy by removing old GPS coordinate data
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgoDate = ninetyDaysAgo.toISOString();

    const { data: deletedPrivateRequests, error: privateDeleteError } = await supabase
      .from('private_ride_requests')
      .delete()
      .lt('created_at', ninetyDaysAgoDate)
      .select('id');

    if (privateDeleteError) {
      console.error('Error deleting old private ride requests:', privateDeleteError);
    } else {
      console.log(`Deleted ${deletedPrivateRequests?.length || 0} old private ride requests (90+ days)`);
    }

    // Also delete old inactive rides (completed, cancelled, expired) older than 90 days
    const { data: deletedOldRides, error: oldRidesDeleteError } = await supabase
      .from('rides')
      .delete()
      .in('status', ['completed', 'cancelled', 'expired'])
      .lt('created_at', ninetyDaysAgoDate)
      .select('id');

    if (oldRidesDeleteError) {
      console.error('Error deleting old inactive rides:', oldRidesDeleteError);
    } else {
      console.log(`Deleted ${deletedOldRides?.length || 0} old inactive rides (90+ days)`);
    }

    const totalExpired = (expiredByDate?.length || 0) + (expiredByTime?.length || 0);
    const totalDeleted = (deletedRides?.length || 0) + (deletedPrivateRequests?.length || 0) + (deletedOldRides?.length || 0);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expired: totalExpired,
        deleted: totalDeleted,
        message: `Expired ${totalExpired} rides, deleted ${totalDeleted} old rides`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in cleanup-expired-rides function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
