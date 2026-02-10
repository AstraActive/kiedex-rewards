-- Add INSERT policy for bonus_claims table to allow users to claim bonuses (idempotent)
DROP POLICY IF EXISTS "Users can insert their own bonus claims" ON public.bonus_claims;
CREATE POLICY "Users can insert their own bonus claims"
ON public.bonus_claims
FOR INSERT
WITH CHECK (auth.uid() = user_id);