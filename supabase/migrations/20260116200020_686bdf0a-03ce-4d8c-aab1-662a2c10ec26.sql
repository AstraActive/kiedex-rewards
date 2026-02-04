-- Add oil_balance column to balances table
ALTER TABLE public.balances 
ADD COLUMN oil_balance integer NOT NULL DEFAULT 0;

-- Give existing users some starting Oil (1000 Oil)
UPDATE public.balances SET oil_balance = 1000;

-- Add RLS policy for updating oil_balance
CREATE POLICY "Users can update their own balances" 
ON public.balances 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Comment on the column
COMMENT ON COLUMN public.balances.oil_balance IS 'Internal fee credits (Oil) used for trading fees. 1 Oil = 0.00000001 ETH';