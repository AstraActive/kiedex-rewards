-- Create system_config table for configurable system parameters
-- This allows changing values without code deployment

-- Create system_config table
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read config (needed for frontend)
CREATE POLICY "Anyone can read system config"
ON public.system_config
FOR SELECT
USING (true);

-- Only service role can update config (admin only)
CREATE POLICY "Only service role can update config"
ON public.system_config
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert default configuration values
INSERT INTO public.system_config (key, value, description) VALUES
  ('daily_pool_kdx', '10000', 'Daily KDX reward pool distributed to traders'),
  ('min_claim_amount', '0.01', 'Minimum KDX amount that can be claimed'),
  ('reward_expiry_hours', '24', 'Hours until unclaimed rewards expire'),
  ('cleanup_after_days', '7', 'Days to keep expired unclaimed rewards before cleanup')
ON CONFLICT (key) DO NOTHING;

-- Create function to get config value with default fallback
CREATE OR REPLACE FUNCTION get_config(
  p_key TEXT,
  p_default TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT value INTO v_value
  FROM public.system_config
  WHERE key = p_key;
  
  RETURN COALESCE(v_value, p_default);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_config TO authenticated, anon;

-- Create function to update config (admin only)
CREATE OR REPLACE FUNCTION update_config(
  p_key TEXT,
  p_value TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.system_config (key, value, description, updated_at)
  VALUES (p_key, p_value, p_description, NOW())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    description = COALESCE(EXCLUDED.description, system_config.description),
    updated_at = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only
GRANT EXECUTE ON FUNCTION update_config TO service_role;

-- Add comments
COMMENT ON TABLE public.system_config IS 
'System-wide configuration parameters that can be changed without code deployment';

COMMENT ON FUNCTION get_config IS 
'Get configuration value by key with optional default fallback';

COMMENT ON FUNCTION update_config IS 
'Update configuration value (admin/service_role only)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config(key);

RAISE NOTICE 'System config table created with default values';
RAISE NOTICE 'Use get_config(''daily_pool_kdx'') to fetch pool size';
RAISE NOTICE 'Use update_config(''daily_pool_kdx'', ''15000'') to change pool size (admin only)';
