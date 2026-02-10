-- Create oil_deposits table for tracking verified deposits
CREATE TABLE IF NOT EXISTS public.oil_deposits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_address text NOT NULL,
    tx_hash text NOT NULL UNIQUE,
    eth_amount numeric NOT NULL,
    oil_credited integer NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    confirmed_at timestamp with time zone
);

-- Enable Row Level Security
ALTER TABLE public.oil_deposits ENABLE ROW LEVEL SECURITY;

-- Create index on tx_hash for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_oil_deposits_tx_hash ON public.oil_deposits(tx_hash);

-- Create index on user_id for user queries
CREATE INDEX IF NOT EXISTS idx_oil_deposits_user_id ON public.oil_deposits(user_id);

-- RLS Policies: Users can view their own deposits (idempotent)
DROP POLICY IF EXISTS "Users can view their own oil deposits" ON public.oil_deposits;
CREATE POLICY "Users can view their own oil deposits"
ON public.oil_deposits
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies: Users can insert pending deposits (but only for themselves) (idempotent)
DROP POLICY IF EXISTS "Users can insert their own oil deposits" ON public.oil_deposits;
CREATE POLICY "Users can insert their own oil deposits"
ON public.oil_deposits
FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');