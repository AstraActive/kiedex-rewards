-- Add missing UPDATE policy for wallet_connections table
-- This allows upserts (INSERT ... ON CONFLICT ... DO UPDATE) to work

CREATE POLICY "Users can update their own wallet connections"
ON public.wallet_connections
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
