-- Add wallet_address column to rewards_claims
ALTER TABLE public.rewards_claims ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Create daily_rewards_snapshot table for finalized daily rewards
CREATE TABLE IF NOT EXISTS public.daily_rewards_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    reward_date DATE NOT NULL,
    volume_score NUMERIC NOT NULL DEFAULT 0,
    total_pool_volume NUMERIC NOT NULL DEFAULT 0,
    reward_amount NUMERIC NOT NULL DEFAULT 0,
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, reward_date)
);

-- Enable RLS
ALTER TABLE public.daily_rewards_snapshot ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_rewards_snapshot
CREATE POLICY "Users can view their own reward snapshots"
ON public.daily_rewards_snapshot
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own unclaimed snapshots"
ON public.daily_rewards_snapshot
FOR UPDATE
USING (auth.uid() = user_id AND is_claimed = false);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_rewards_snapshot_user_date 
ON public.daily_rewards_snapshot(user_id, reward_date);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_snapshot_unclaimed 
ON public.daily_rewards_snapshot(reward_date, is_claimed) 
WHERE is_claimed = false;