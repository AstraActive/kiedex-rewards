-- Atomic function to process referral bonus in a single transaction
-- Fixes: race condition on balance update, missing atomicity between balance + history insert
CREATE OR REPLACE FUNCTION process_referral_bonus(
  p_referrer_id UUID,
  p_referred_id UUID,
  p_claim_id UUID,
  p_claimed_amount NUMERIC,
  p_bonus_percentage NUMERIC DEFAULT 0.08
)
RETURNS TABLE(
  success BOOLEAN,
  bonus_amount NUMERIC,
  new_balance NUMERIC,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bonus_amount NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Calculate bonus
  v_bonus_amount := p_claimed_amount * p_bonus_percentage;

  -- Check if bonus already paid for this claim (idempotency)
  IF EXISTS (
    SELECT 1 FROM referral_bonus_history WHERE claim_id = p_claim_id
  ) THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 'Bonus already paid for this claim'::TEXT;
    RETURN;
  END IF;

  -- Step 1: Insert bonus history record FIRST (has unique constraint on claim_id)
  BEGIN
    INSERT INTO referral_bonus_history (
      referrer_user_id,
      referred_user_id,
      claim_id,
      claimed_amount,
      referral_bonus_amount
    ) VALUES (
      p_referrer_id,
      p_referred_id,
      p_claim_id,
      p_claimed_amount,
      v_bonus_amount
    );
  EXCEPTION
    WHEN unique_violation THEN
      RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 'Bonus already paid (race condition prevented)'::TEXT;
      RETURN;
  END;

  -- Step 2: Atomically update referrer's KDX balance
  UPDATE balances
  SET kdx_balance = kdx_balance + v_bonus_amount
  WHERE user_id = p_referrer_id
  RETURNING kdx_balance INTO v_new_balance;

  -- If no balance row exists, create one
  IF v_new_balance IS NULL THEN
    INSERT INTO balances (user_id, kdx_balance)
    VALUES (p_referrer_id, v_bonus_amount)
    RETURNING kdx_balance INTO v_new_balance;
  END IF;

  -- Step 3: Update bonus_granted on the referral record
  UPDATE referrals
  SET bonus_granted = true
  WHERE referrer_id = p_referrer_id
    AND referred_id = p_referred_id;

  RETURN QUERY SELECT true, v_bonus_amount, v_new_balance, 'Bonus processed successfully'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    -- Entire transaction rolls back automatically
    RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, ('Error: ' || SQLERRM)::TEXT;
END;
$$;
