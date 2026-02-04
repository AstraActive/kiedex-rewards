-- Add expires_at column to daily_rewards_snapshot
ALTER TABLE public.daily_rewards_snapshot 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for expiry queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_daily_rewards_snapshot_expiry 
ON public.daily_rewards_snapshot(expires_at) 
WHERE is_claimed = false;

-- Add comment for documentation
COMMENT ON COLUMN public.daily_rewards_snapshot.expires_at IS 
'Timestamp when the reward expires. Typically set to end of day (23:59:59 UTC) when reward is generated.';

-- Backfill existing records without expires_at
-- Set to end of the day after reward_date
UPDATE public.daily_rewards_snapshot
SET expires_at = (reward_date + INTERVAL '1 day' + TIME '23:59:59')::timestamp with time zone
WHERE expires_at IS NULL;
