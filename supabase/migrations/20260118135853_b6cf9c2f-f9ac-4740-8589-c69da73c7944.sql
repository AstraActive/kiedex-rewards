-- Add status and activated_at columns to referrals table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'status') THEN
    ALTER TABLE public.referrals ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referrals' AND column_name = 'activated_at') THEN
    ALTER TABLE public.referrals ADD COLUMN activated_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add constraint for valid status values (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE constraint_name = 'referrals_status_check') THEN
    ALTER TABLE public.referrals ADD CONSTRAINT referrals_status_check CHECK (status IN ('pending', 'active'));
  END IF;
END $$;

-- Create referral_bonus_history table to track bonus payouts (idempotent)
CREATE TABLE IF NOT EXISTS public.referral_bonus_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  claim_id UUID NOT NULL,
  claimed_amount NUMERIC NOT NULL,
  referral_bonus_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint on claim_id to prevent double crediting (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_bonus_history_claim_id ON public.referral_bonus_history(claim_id);

-- Enable RLS on referral_bonus_history
ALTER TABLE public.referral_bonus_history ENABLE ROW LEVEL SECURITY;

-- Referrers can view their own bonus history (idempotent)
DROP POLICY IF EXISTS "Users can view their own referral bonus history" ON public.referral_bonus_history;
CREATE POLICY "Users can view their own referral bonus history"
ON public.referral_bonus_history
FOR SELECT
USING (auth.uid() = referrer_user_id);

-- Users can insert bonus records (needed for the claim flow) (idempotent)
DROP POLICY IF EXISTS "Users can insert referral bonus history" ON public.referral_bonus_history;
CREATE POLICY "Users can insert referral bonus history"
ON public.referral_bonus_history
FOR INSERT
WITH CHECK (auth.uid() = referred_user_id);

-- Add RLS policy for referrals - allow users to update status when they are the referred user (idempotent)
DROP POLICY IF EXISTS "Users can update their own referral status" ON public.referrals;
CREATE POLICY "Users can update their own referral status"
ON public.referrals
FOR UPDATE
USING (auth.uid() = referred_id);

-- Add RLS policy for users to view referrals where they are the referred user (idempotent)
DROP POLICY IF EXISTS "Users can view referrals where they are referred" ON public.referrals;
CREATE POLICY "Users can view referrals where they are referred"
ON public.referrals
FOR SELECT
USING (auth.uid() = referred_id);

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