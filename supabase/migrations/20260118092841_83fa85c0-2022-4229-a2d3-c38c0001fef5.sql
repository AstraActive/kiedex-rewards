-- Add linked_wallet_address column to profiles with UNIQUE constraint
ALTER TABLE profiles 
ADD COLUMN linked_wallet_address TEXT UNIQUE;

-- Create index for fast lookups when checking if wallet is already used
CREATE INDEX idx_profiles_linked_wallet ON profiles(linked_wallet_address) 
WHERE linked_wallet_address IS NOT NULL;