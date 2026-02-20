-- ============================================================
-- SECURITY FIXES - 2026-02-20
-- ============================================================

-- ── Fix 1: Add missing UPDATE RLS policy on balances ─────────
-- Without this, any authenticated user's Supabase client could
-- call: supabase.from('balances').update({kdx_balance: 999999}).eq('user_id', victim_id)
-- Edge functions bypass RLS via service_role, but the anon/user client does not.
-- We block ALL direct updates from user clients — only edge functions (service role) may update balances.

DROP POLICY IF EXISTS "Users can update their own balances" ON public.balances;

-- Intentionally NO update policy for authenticated users.
-- Balances are updated exclusively by server-side edge functions
-- (execute-trade, close-trade, verify-oil-deposit, claim_reward RPC).
-- Any direct UPDATE from a user JWT will be blocked by RLS.

-- Sanity check: confirm RLS is still enabled
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;


-- ── Fix 2: Lock search_path on claim_reward (SECURITY DEFINER) ─
-- Without SET search_path, a malicious user could create a schema
-- with a fake 'balances' table to hijack the function's UPDATE.

CREATE OR REPLACE FUNCTION claim_reward(
  p_claim_date DATE,
  p_user_id UUID,
  p_wallet_address TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  claim_id UUID,
  reward_amount NUMERIC,
  new_kdx_balance NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_user_volume NUMERIC;
  v_total_pool_volume NUMERIC;
  v_daily_pool NUMERIC;
  v_user_share NUMERIC;
  v_reward_amount NUMERIC;
  v_new_balance NUMERIC;
  v_claim_id UUID;
  v_claim_window_start TIMESTAMPTZ;
  v_claim_window_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get daily pool size from system_config (fallback to 10000)
  SELECT COALESCE(
    (SELECT value::NUMERIC FROM public.system_config WHERE key = 'daily_pool_kdx'),
    10000
  ) INTO v_daily_pool;

  -- Claim window: 00:00:00 UTC on (date + 1) until 23:59:59 UTC on (date + 1)
  v_claim_window_start := (p_claim_date + INTERVAL '1 day')::DATE + TIME '00:00:00';
  v_claim_window_end   := (p_claim_date + INTERVAL '1 day')::DATE + TIME '23:59:59';

  IF v_now < v_claim_window_start THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 0::NUMERIC,
      'Rewards not yet available. Claim window opens at 00:00 UTC.'::TEXT;
    RETURN;
  END IF;

  IF v_now > v_claim_window_end THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 0::NUMERIC,
      'Claim window has expired. Rewards must be claimed within 24 hours.'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rewards_claims
    WHERE user_id = p_user_id AND claim_date = p_claim_date
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 0::NUMERIC,
      'Reward already claimed for this date'::TEXT;
    RETURN;
  END IF;

  SELECT total_counted_volume INTO v_user_volume
  FROM public.leaderboard_daily
  WHERE user_id = p_user_id AND date = p_claim_date;

  IF v_user_volume IS NULL OR v_user_volume <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 0::NUMERIC,
      'No trading activity found for this date'::TEXT;
    RETURN;
  END IF;

  SELECT SUM(total_counted_volume) INTO v_total_pool_volume
  FROM public.leaderboard_daily
  WHERE date = p_claim_date AND total_counted_volume > 0;

  IF v_total_pool_volume IS NULL OR v_total_pool_volume <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 0::NUMERIC,
      'No pool volume found for this date'::TEXT;
    RETURN;
  END IF;

  v_user_share   := v_user_volume / v_total_pool_volume;
  v_reward_amount := v_user_share * v_daily_pool;

  IF v_reward_amount <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 0::NUMERIC,
      'Calculated reward amount is zero'::TEXT;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.rewards_claims (user_id, amount, volume_score, claim_date, wallet_address)
    VALUES (p_user_id, v_reward_amount, v_user_volume, p_claim_date, p_wallet_address)
    RETURNING id INTO v_claim_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 0::NUMERIC,
        'Reward already claimed (race condition prevented)'::TEXT;
      RETURN;
  END;

  UPDATE public.balances
  SET kdx_balance = kdx_balance + v_reward_amount
  WHERE user_id = p_user_id
  RETURNING kdx_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    INSERT INTO public.balances (user_id, kdx_balance)
    VALUES (p_user_id, v_reward_amount)
    RETURNING kdx_balance INTO v_new_balance;
  END IF;

  RETURN QUERY SELECT true, v_claim_id, v_reward_amount, v_new_balance,
    'Reward claimed successfully'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Claim failed: %', SQLERRM;
    RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 0::NUMERIC,
      ('Claim failed: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;   -- ← prevents search_path hijack

GRANT EXECUTE ON FUNCTION claim_reward TO authenticated;


-- ── Fix 3: Lock search_path on update_config (SECURITY DEFINER) ─

CREATE OR REPLACE FUNCTION update_config(
  p_key TEXT,
  p_value TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.system_config (key, value, description, updated_at)
  VALUES (p_key, p_value, p_description, NOW())
  ON CONFLICT (key)
  DO UPDATE SET
    value       = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, public.system_config.description),
    updated_at  = NOW();
  RETURN true;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;   -- ← prevents search_path hijack

GRANT EXECUTE ON FUNCTION update_config TO service_role;
