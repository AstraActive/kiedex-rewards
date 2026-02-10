import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Referral Bonus] No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('[Referral Bonus] Invalid user:', userError);
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { claimId, claimedAmount } = await req.json();
    console.log(`[Referral Bonus] Processing for claim ${claimId}, amount ${claimedAmount}, user ${user.id}`);

    if (!claimId || !claimedAmount) {
      return new Response(JSON.stringify({ error: 'Missing claimId or claimedAmount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the claim belongs to this user
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('rewards_claims')
      .select('id, user_id, amount')
      .eq('id', claimId)
      .eq('user_id', user.id)
      .single();

    if (claimError || !claim) {
      console.error('[Referral Bonus] Invalid claim:', claimError);
      return new Response(JSON.stringify({ error: 'Invalid claim', details: claimError?.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for active referral (someone referred this user)
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id, status')
      .eq('referred_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (referralError) {
      console.error('[Referral Bonus] Error checking referral:', referralError);
    }

    if (!referral) {
      console.log('[Referral Bonus] No active referral found for user', user.id);
      return new Response(JSON.stringify({ message: 'No active referral', processed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Referral Bonus] Found active referral, referrer: ${referral.referrer_id}`);

    // Calculate 8% bonus
    const bonusAmount = Number(claim.amount) * 0.08;
    console.log(`[Referral Bonus] Calculated bonus: ${bonusAmount} KDX (8% of ${claim.amount})`);

    // Use atomic database function to process bonus in a single transaction
    // This prevents race conditions and ensures balance + history are consistent
    const { data: result, error: rpcError } = await supabaseAdmin
      .rpc('process_referral_bonus', {
        p_referrer_id: referral.referrer_id,
        p_referred_id: user.id,
        p_claim_id: claimId,
        p_claimed_amount: Number(claim.amount),
        p_bonus_percentage: 0.08,
      })
      .single();

    if (rpcError) {
      console.error('[Referral Bonus] RPC error:', rpcError);
      return new Response(JSON.stringify({ error: 'Failed to process bonus', details: rpcError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!result.success) {
      console.log(`[Referral Bonus] Not processed: ${result.message}`);
      return new Response(JSON.stringify({ message: result.message, processed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Referral Bonus] ✅ Successfully paid ${result.bonus_amount} KDX to referrer ${referral.referrer_id} (new balance: ${result.new_balance})`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: true,
      bonusAmount: result.bonus_amount,
      referrerId: referral.referrer_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[Referral Bonus] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
