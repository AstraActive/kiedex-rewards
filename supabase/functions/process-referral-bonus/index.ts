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

    // Check if bonus already paid for this claim
    const { data: existingBonus } = await supabaseAdmin
      .from('referral_bonus_history')
      .select('id')
      .eq('claim_id', claimId)
      .maybeSingle();

    if (existingBonus) {
      console.log('[Referral Bonus] Bonus already paid for claim', claimId);
      return new Response(JSON.stringify({ message: 'Bonus already paid', processed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate 8% bonus
    const bonusAmount = Number(claim.amount) * 0.08;
    console.log(`[Referral Bonus] Calculated bonus: ${bonusAmount} KDX (8% of ${claim.amount})`);

    // Get referrer's current balance
    const { data: referrerBalance, error: balanceError } = await supabaseAdmin
      .from('balances')
      .select('kdx_balance')
      .eq('user_id', referral.referrer_id)
      .single();

    if (balanceError) {
      console.error('[Referral Bonus] Error fetching referrer balance:', balanceError);
      
      // If balance row doesn't exist, create one
      if (balanceError.code === 'PGRST116') {
        console.log('[Referral Bonus] Creating balance row for referrer');
        const { error: insertError } = await supabaseAdmin
          .from('balances')
          .insert({ user_id: referral.referrer_id, kdx_balance: bonusAmount });
        
        if (insertError) {
          console.error('[Referral Bonus] Failed to create balance row:', insertError);
          return new Response(JSON.stringify({ error: 'Failed to create balance' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: 'Failed to fetch balance' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      const newBalance = (referrerBalance?.kdx_balance || 0) + bonusAmount;
      console.log(`[Referral Bonus] Updating referrer balance: ${referrerBalance?.kdx_balance || 0} -> ${newBalance}`);

      // Update referrer's KDX balance (using service role - bypasses RLS)
      const { error: updateError } = await supabaseAdmin
        .from('balances')
        .update({ kdx_balance: newBalance })
        .eq('user_id', referral.referrer_id);

      if (updateError) {
        console.error('[Referral Bonus] Failed to update balance:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update balance' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Record bonus history
    const { error: historyError } = await supabaseAdmin
      .from('referral_bonus_history')
      .insert({
        referrer_user_id: referral.referrer_id,
        referred_user_id: user.id,
        claim_id: claimId,
        claimed_amount: claim.amount,
        referral_bonus_amount: bonusAmount,
      });

    if (historyError) {
      console.error('[Referral Bonus] Failed to record bonus history:', historyError);
      // Don't fail the whole operation if history insert fails
    } else {
      console.log('[Referral Bonus] Bonus history recorded successfully');
    }

    console.log(`[Referral Bonus] ✅ Successfully paid ${bonusAmount} KDX to referrer ${referral.referrer_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: true,
      bonusAmount,
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
