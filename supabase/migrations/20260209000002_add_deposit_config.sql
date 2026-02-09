-- Add deposit configuration to system_config table
-- Allows admin to update deposit settings without redeploying code

INSERT INTO public.system_config (key, value, description) VALUES
  ('deposit_admin_wallet', '0x0000000000000000000000000000000000000000', 'Admin wallet address for receiving deposits (Base mainnet)'),
  ('deposit_chain_id', '8453', 'Chain ID for deposits (8453 = Base mainnet)'),
  ('deposit_min_amount', '0.00000001', 'Minimum ETH deposit amount'),
  ('deposit_conversion_rate', '100000000', 'Conversion rate: 1 ETH = X Oil')
ON CONFLICT (key) DO NOTHING;

-- Comment for documentation
COMMENT ON TABLE public.system_config IS 
'System-wide configuration values that can be updated by admins without code deployment. 
To update deposit config:
UPDATE system_config SET value = ''0xYourWalletAddress'' WHERE key = ''deposit_admin_wallet'';
UPDATE system_config SET value = ''200000000'' WHERE key = ''deposit_conversion_rate'';';
