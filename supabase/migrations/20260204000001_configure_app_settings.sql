-- Configure app settings for cron jobs
-- Run this in Supabase SQL Editor or via CLI

-- Create app schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS app;

-- Create settings table
CREATE TABLE IF NOT EXISTS app.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert configuration
INSERT INTO app.settings (key, value) VALUES
  ('supabase_url', 'https://oxjkyerdjhvxcqkbrlak.supabase.co'),
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94amt5ZXJkamh2eGNxa2JybGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIwOTI0NiwiZXhwIjoyMDg1Nzg1MjQ2fQ.fIbMkVtZYqJCjGt1f1M01X29ClbFN1lJHp3ufAcZ5kE')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create a manual trigger function for testing rewards generation
CREATE OR REPLACE FUNCTION trigger_daily_rewards_generation()
RETURNS TEXT AS $$
DECLARE
  v_url TEXT;
  v_auth_key TEXT;
BEGIN
  -- Read settings from app.settings table
  SELECT value INTO v_url FROM app.settings WHERE key = 'supabase_url';
  SELECT value INTO v_auth_key FROM app.settings WHERE key = 'service_role_key';
  
  IF v_url IS NULL OR v_auth_key IS NULL THEN
    RETURN 'ERROR: app.settings not configured properly';
  END IF;
  
  -- Call the edge function
  PERFORM net.http_post(
    url := v_url || '/functions/v1/generate-daily-rewards',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_auth_key
    ),
    body := '{}'::jsonb
  );
  
  RETURN 'Daily rewards generation triggered successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users for testing
GRANT EXECUTE ON FUNCTION trigger_daily_rewards_generation TO authenticated;

-- Verify
SELECT * FROM app.settings;
