-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update their own unclaimed snapshots" ON public.daily_rewards_snapshot;

-- Create a new update policy with proper USING and WITH CHECK clauses
-- USING: allows updating rows where user owns the row AND it's currently unclaimed
-- WITH CHECK: allows the update result to have is_claimed = true (claiming the reward)
CREATE POLICY "Users can update their own unclaimed snapshots"
ON public.daily_rewards_snapshot
FOR UPDATE
USING (auth.uid() = user_id AND is_claimed = false)
WITH CHECK (auth.uid() = user_id);