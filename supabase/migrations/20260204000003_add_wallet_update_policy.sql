-- Add missing UPDATE policy for wallet_connections table (idempotent)
-- This allows upserts (INSERT ... ON CONFLICT ... DO UPDATE) to work

DROP POLICY IF EXISTS "Users can update their own wallet connections" ON public.wallet_connections;
CREATE POLICY "Users can update their own wallet connections"
ON public.wallet_connections
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
