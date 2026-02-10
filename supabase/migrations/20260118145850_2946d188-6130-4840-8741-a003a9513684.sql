-- Allow referrers to view the linked_wallet_address of their referred users
-- This is needed for the referral page to show which wallets were referred

-- Create a policy that allows viewing wallet addresses of users you referred (idempotent)
DROP POLICY IF EXISTS "Referrers can view referred user wallet addresses" ON public.profiles;
CREATE POLICY "Referrers can view referred user wallet addresses"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referrals.referrer_id = auth.uid()
    AND referrals.referred_id = profiles.user_id
  )
);