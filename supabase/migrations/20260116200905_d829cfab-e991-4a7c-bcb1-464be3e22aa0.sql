-- Create oil_deposits table for tracking verified deposits
CREATE TABLE public.oil_deposits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
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
CREATE INDEX idx_oil_deposits_tx_hash ON public.oil_deposits(tx_hash);

-- Create index on user_id for user queries
CREATE INDEX idx_oil_deposits_user_id ON public.oil_deposits(user_id);

-- RLS Policies: Users can view their own deposits
CREATE POLICY "Users can view their own oil deposits"
ON public.oil_deposits
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies: Users can insert pending deposits (but only for themselves)
CREATE POLICY "Users can insert their own oil deposits"
ON public.oil_deposits
FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Note: Updates to status/confirmed_at are handled by service role (edge function)
-- No UPDATE policy for regular users