import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_DAILY_POOL = 10000; // Fallback if database config unavailable

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get daily pool size from database config
    const { data: poolConfig } = await supabase.rpc('get_config', {
      p_key: 'daily_pool_kdx',
      p_default: DEFAULT_DAILY_POOL.toString(),
    });
    
    const DAILY_POOL = parseFloat(poolConfig || DEFAULT_DAILY_POOL.toString());
    console.log(`Using daily pool size: ${DAILY_POOL} KDX`);

    // Get yesterday's date (the day we're calculating rewards for)
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`Generating daily rewards snapshot for date: ${yesterdayStr}`);

    // Check if snapshot already exists for yesterday
    const { data: existingSnapshot, error: checkError } = await supabase
      .from('daily_rewards_snapshot')
      .select('id')
      .eq('reward_date', yesterdayStr)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing snapshot:', checkError);
      throw checkError;
    }

    if (existingSnapshot && existingSnapshot.length > 0) {
      console.log(`Snapshot already exists for ${yesterdayStr}, skipping generation`);
      return new Response(
        JSON.stringify({ success: true, message: 'Snapshot already exists', date: yesterdayStr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all leaderboard entries for yesterday with counted volume > 0
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('leaderboard_daily')
      .select('user_id, total_counted_volume')
      .eq('date', yesterdayStr)
      .gt('total_counted_volume', 0);

    if (leaderboardError) {
      console.error('Error fetching leaderboard data:', leaderboardError);
      throw leaderboardError;
    }

    if (!leaderboardData || leaderboardData.length === 0) {
      console.log(`No trading activity found for ${yesterdayStr}`);
      return new Response(
        JSON.stringify({ success: true, message: 'No trading activity', date: yesterdayStr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total pool volume
    const totalPoolVolume = leaderboardData.reduce(
      (sum, entry) => sum + (entry.total_counted_volume || 0), 
      0
    );

    console.log(`Total pool volume: ${totalPoolVolume}, Active users: ${leaderboardData.length}`);

    // IMPORTANT: expires_at = END OF TODAY (23:59:59 UTC)
    // This means: rewards generated at 00:00 today expire at 23:59:59 today
    const today = new Date();
    const expiresAt = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      23, 59, 59, 999 // End of today UTC
    ));
    const expiresAtStr = expiresAt.toISOString();

    console.log(`Claim window expires at: ${expiresAtStr} (end of today UTC)`);

    // Generate snapshot records for each user with expiry
    const snapshotRecords = leaderboardData.map(entry => {
      const userShare = entry.total_counted_volume / totalPoolVolume;
      const rewardAmount = userShare * DAILY_POOL;

      return {
        user_id: entry.user_id,
        reward_date: yesterdayStr,
        volume_score: entry.total_counted_volume,
        total_pool_volume: totalPoolVolume,
        reward_amount: rewardAmount,
        is_claimed: false,
        expires_at: expiresAtStr, // Expires at end of today
      };
    });

    // Insert snapshot records
    const { error: insertError } = await supabase
      .from('daily_rewards_snapshot')
      .insert(snapshotRecords);

    if (insertError) {
      console.error('Error inserting snapshot records:', insertError);
      throw insertError;
    }

    console.log(`Successfully created ${snapshotRecords.length} snapshot records for ${yesterdayStr} (expires: ${expiresAtStr})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${snapshotRecords.length} reward snapshots`,
        date: yesterdayStr,
        totalVolume: totalPoolVolume,
        totalRewards: DAILY_POOL,
        expiresAt: expiresAtStr
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating daily rewards:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
