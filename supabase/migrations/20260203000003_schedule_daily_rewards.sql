-- Schedule daily rewards generation at 00:00 UTC
-- This job calls the generate-daily-rewards edge function every day at midnight
SELECT cron.schedule(
  'generate-daily-rewards',           -- Job name
  '0 0 * * *',                        -- Cron expression: Every day at 00:00 UTC
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-daily-rewards',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
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
