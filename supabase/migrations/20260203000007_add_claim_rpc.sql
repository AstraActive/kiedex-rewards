-- Create atomic claim_reward RPC function with transaction wrapping
-- This ensures all claim operations succeed or fail together (no partial states)

CREATE OR REPLACE FUNCTION claim_reward(
  p_snapshot_id UUID,
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
  v_reward_amount NUMERIC;
  v_reward_date DATE;
  v_volume_score NUMERIC;
  v_expires_at TIMESTAMPTZ;
  v_is_claimed BOOLEAN;
  v_new_balance NUMERIC;
  v_claim_id UUID;
BEGIN
  -- Lock and validate snapshot row (prevents double claims)
  SELECT 
    reward_amount, 
    reward_date, 
    volume_score, 
    expires_at, 
    is_claimed
  INTO 
    v_reward_amount, 
    v_reward_date, 
    v_volume_score, 
    v_expires_at, 
    v_is_claimed
  FROM daily_rewards_snapshot
  WHERE id = p_snapshot_id
    AND user_id = p_user_id
  FOR UPDATE; -- Lock row to prevent race conditions
  
  -- Validation: Snapshot exists
  IF v_reward_amount IS NULL THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      0::NUMERIC, 
      0::NUMERIC, 
      'Reward snapshot not found'::TEXT;
    RETURN;
  END IF;
  
  -- Validation: Not already claimed
  IF v_is_claimed THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      v_reward_amount, 
      0::NUMERIC, 
      'Reward already claimed'::TEXT;
    RETURN;
  END IF;
  
  -- Validation: Not expired
  IF v_expires_at < NOW() THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      v_reward_amount, 
      0::NUMERIC, 
      'Claim window has expired'::TEXT;
    RETURN;
  END IF;
  
  -- Validation: Amount > 0
  IF v_reward_amount <= 0 THEN
    RETURN QUERY SELECT 
      false, 
      NULL::UUID, 
      v_reward_amount, 
      0::NUMERIC, 
      'No rewards to claim'::TEXT;
    RETURN;
  END IF;
  
  -- Step 1: Mark snapshot as claimed
  UPDATE daily_rewards_snapshot
  SET 
    is_claimed = true, 
    claimed_at = NOW()
  WHERE id = p_snapshot_id;
  
  -- Step 2: Insert claim record
  INSERT INTO rewards_claims (
    user_id, 
    amount, 
    volume_score, 
    claim_date, 
    wallet_address
  ) VALUES (
    p_user_id, 
    v_reward_amount, 
    v_volume_score, 
    v_reward_date, 
    p_wallet_address
  )
  RETURNING id INTO v_claim_id;
  
  -- Step 3: Update user's KDX balance
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
'Atomically claims daily trading rewards with transaction wrapping. All operations succeed or fail together.';

-- Example usage:
-- SELECT * FROM claim_reward(
--   p_snapshot_id := '123e4567-e89b-12d3-a456-426614174000'::UUID,
--   p_user_id := '123e4567-e89b-12d3-a456-426614174001'::UUID,
--   p_wallet_address := '0x1234...'::TEXT
-- );
