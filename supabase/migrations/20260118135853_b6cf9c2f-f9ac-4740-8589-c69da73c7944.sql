-- Add status and activated_at columns to referrals table
ALTER TABLE public.referrals 
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN activated_at TIMESTAMP WITH TIME ZONE;

-- Add constraint for valid status values
ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_status_check CHECK (status IN ('pending', 'active'));

-- Create referral_bonus_history table to track 8% bonus payouts
CREATE TABLE public.referral_bonus_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  claim_id UUID NOT NULL,
  claimed_amount NUMERIC NOT NULL,
  referral_bonus_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint on claim_id to prevent double crediting
CREATE UNIQUE INDEX idx_referral_bonus_history_claim_id ON public.referral_bonus_history(claim_id);

-- Enable RLS on referral_bonus_history
ALTER TABLE public.referral_bonus_history ENABLE ROW LEVEL SECURITY;

-- Referrers can view their own bonus history
CREATE POLICY "Users can view their own referral bonus history"
ON public.referral_bonus_history
FOR SELECT
USING (auth.uid() = referrer_user_id);

-- Users can insert bonus records (needed for the claim flow)
CREATE POLICY "Users can insert referral bonus history"
ON public.referral_bonus_history
FOR INSERT
WITH CHECK (auth.uid() = referred_user_id);

-- Add RLS policy for referrals - allow users to update status when they are the referred user
CREATE POLICY "Users can update their own referral status"
ON public.referrals
FOR UPDATE
USING (auth.uid() = referred_id);

-- Add RLS policy for users to view referrals where they are the referred user (needed for activation check)
CREATE POLICY "Users can view referrals where they are referred"
ON public.referrals
FOR SELECT
USING (auth.uid() = referred_id);