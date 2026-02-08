-- Add wallet_address column to rewards_claims
ALTER TABLE public.rewards_claims ADD COLUMN IF NOT EXISTS wallet_address TEXT;