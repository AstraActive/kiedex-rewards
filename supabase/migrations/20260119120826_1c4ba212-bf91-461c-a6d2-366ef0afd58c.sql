-- Add unique constraint on referred_id to prevent duplicate referrals
-- First check if it exists (under either possible name), if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname IN ('unique_referred_user', 'referrals_referred_id_key')
  ) THEN
    ALTER TABLE referrals ADD CONSTRAINT unique_referred_user UNIQUE (referred_id);
  END IF;
END $$;

-- Ensure the INSERT policy for referrals allows users to insert their own referral record
DROP POLICY IF EXISTS "Users can insert referrals" ON referrals;
CREATE POLICY "Users can insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_id);