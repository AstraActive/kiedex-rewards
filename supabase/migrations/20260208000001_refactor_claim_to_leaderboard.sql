-- Refactor claim_reward to read directly from leaderboard_daily
-- Eliminates need for daily_rewards_snapshot and external triggers
-- Rewards are available to claim after 00:00 UTC until 23:59:59 same day

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
  v_daily_pool NUMERIC; -- Loaded from system_config table
  v_user_share NUMERIC;
  v_reward_amount NUMERIC;
  v_new_balance NUMERIC;
  v_claim_id UUID;
  v_claim_window_start TIMESTAMPTZ;
  v_claim_window_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get daily pool size from system_config (fallback to 10000 if not configured)
  -- To change: UPDATE system_config SET value = '15000' WHERE key = 'daily_pool_kdx';
  SELECT COALESCE(
    (SELECT value::NUMERIC FROM system_config WHERE key = 'daily_pool_kdx'),
    10000
  ) INTO v_daily_pool;

  -- Calculate claim window for this date
  -- Claim window: 00:00:00 UTC on (date + 1 day) until 23:59:59 UTC on (date + 1 day)
  v_claim_window_start := (p_claim_date + INTERVAL '1 day')::DATE + TIME '00:00:00';
  v_claim_window_end := (p_claim_date + INTERVAL '1 day')::DATE + TIME '23:59:59';

  -- Validation: Check if within claim window
  IF v_now < v_claim_window_start THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      0::NUMERIC, 
      0::NUMERIC, 
      'Rewards not yet available. Claim window opens at 00:00 UTC.'::TEXT;
    RETURN;
  END IF;

  IF v_now > v_claim_window_end THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      0::NUMERIC, 
      0::NUMERIC, 
      'Claim window has expired. Rewards must be claimed within 24 hours.'::TEXT;
    RETURN;
  END IF;

  -- Validation: Check if already claimed (unique constraint prevents duplicates)
  IF EXISTS (
    SELECT 1 FROM rewards_claims 
    WHERE user_id = p_user_id AND claim_date = p_claim_date
  ) THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      0::NUMERIC, 
      0::NUMERIC, 
      'Reward already claimed for this date'::TEXT;
    RETURN;
  END IF;

  -- Get user's volume for the claim date
  SELECT total_counted_volume
  INTO v_user_volume
  FROM leaderboard_daily
  WHERE user_id = p_user_id AND date = p_claim_date;

  -- Validation: User must have traded on this date
  IF v_user_volume IS NULL OR v_user_volume <= 0 THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      0::NUMERIC, 
      0::NUMERIC, 
      'No trading activity found for this date'::TEXT;
    RETURN;
  END IF;

  -- Get total pool volume for the claim date
  SELECT SUM(total_counted_volume)
  INTO v_total_pool_volume
  FROM leaderboard_daily
  WHERE date = p_claim_date AND total_counted_volume > 0;

  -- Validation: Pool must have volume
  IF v_total_pool_volume IS NULL OR v_total_pool_volume <= 0 THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      0::NUMERIC, 
      0::NUMERIC, 
      'No pool volume found for this date'::TEXT;
    RETURN;
  END IF;

  -- Calculate reward amount
  v_user_share := v_user_volume / v_total_pool_volume;
  v_reward_amount := v_user_share * v_daily_pool;

  -- Validation: Amount must be positive
  IF v_reward_amount <= 0 THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      0::NUMERIC, 
      0::NUMERIC, 
      'Calculated reward amount is zero'::TEXT;
    RETURN;
  END IF;

  -- Step 1: Insert claim record (unique constraint prevents double claims)
  BEGIN
    INSERT INTO rewards_claims (
      user_id, 
      amount, 
      volume_score, 
      claim_date, 
      wallet_address
    ) VALUES (
      p_user_id, 
      v_reward_amount, 
      v_user_volume, 
      p_claim_date, 
      p_wallet_address
    )
    RETURNING id INTO v_claim_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN QUERY SELECT 
        false, 
        NULL::UUID, 
        0::NUMERIC, 
        0::NUMERIC, 
        'Reward already claimed (race condition prevented)'::TEXT;
      RETURN;
  END;
  
  -- Step 2: Update user's KDX balance
  UPDATE balances
  SET kdx_balance = kdx_balance + v_reward_amount
  WHERE user_id = p_user_id
  RETURNING kdx_balance INTO v_new_balance;
  
  -- If no balance row exists, create one
  IF v_new_balance IS NULL THEN
    INSERT INTO balances (user_id, kdx_balance)
    VALUES (p_user_id, v_reward_amount)
    RETURNING kdx_balance INTO v_new_balance;
  END IF;
  
  -- Return success
  RETURN QUERY SELECT 
    true, 
    v_claim_id, 
    v_reward_amount, 
    v_new_balance, 
    'Reward claimed successfully'::TEXT;
    
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically on exception
    RAISE NOTICE 'Claim failed: %', SQLERRM;
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      0::NUMERIC, 
      0::NUMERIC, 
      ('Claim failed: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION claim_reward TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION claim_reward IS 
'Atomically claims daily trading rewards by reading from leaderboard_daily. No external triggers needed.
Claim window: 05:00 UTC day after trading until 04:59:59 UTC two days after trading.';

-- Example usage:
-- Claim rewards for trading done on 2026-02-07 (can claim from 2026-02-08 05:00 UTC to 2026-02-09 04:59:59 UTC)
-- SELECT * FROM claim_reward(
--   p_claim_date := '2026-02-07'::DATE,
--   p_user_id := '123e4567-e89b-12d3-a456-426614174001'::UUID,
--   p_wallet_address := '0x1234...'::TEXT
-- );
