-- Schedule daily rewards generation at 00:00 UTC
-- This job calls the generate-daily-rewards edge function every day at midnight

-- First create a helper function that reads from app.settings table
CREATE OR REPLACE FUNCTION call_generate_daily_rewards()
RETURNS void AS $$
DECLARE
  v_url TEXT;
  v_auth_key TEXT;
BEGIN
  -- Read settings from app.settings table
  SELECT value INTO v_url FROM app.settings WHERE key = 'supabase_url';
  SELECT value INTO v_auth_key FROM app.settings WHERE key = 'service_role_key';
  
  -- Call the edge function
  PERFORM net.http_post(
    url := v_url || '/functions/v1/generate-daily-rewards',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_auth_key
    ),
    body := '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now schedule the helper function
SELECT cron.schedule(
  'generate-daily-rewards',
  '0 0 * * *',
  $$SELECT call_generate_daily_rewards()$$
);

-- Verify the cron job was scheduled successfully
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-rewards') THEN
    RAISE NOTICE 'Cron job "generate-daily-rewards" scheduled successfully';
  ELSE
    RAISE WARNING 'Failed to schedule cron job "generate-daily-rewards"';
  END IF;
END $$;
