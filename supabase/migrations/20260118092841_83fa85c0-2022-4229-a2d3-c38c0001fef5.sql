-- Add linked_wallet_address column to profiles with UNIQUE constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'linked_wallet_address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN linked_wallet_address TEXT UNIQUE;
  END IF;
END $$;

-- Create index for fast lookups when checking if wallet is already used
CREATE INDEX IF NOT EXISTS idx_profiles_linked_wallet ON profiles(linked_wallet_address) 
WHERE linked_wallet_address IS NOT NULL;