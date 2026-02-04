-- Cleanup job to delete expired unclaimed rewards after 7 days
-- This prevents the daily_rewards_snapshot table from growing indefinitely

-- Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_rewards()
RETURNS void AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired unclaimed rewards older than 7 days
  DELETE FROM public.daily_rewards_snapshot
  WHERE is_claimed = false
    AND expires_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleanup: Deleted % expired unclaimed rewards', deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup job to run daily at 01:00 UTC (after reward generation)
SELECT cron.schedule(
  'cleanup-expired-rewards',
  '0 1 * * *',  -- Every day at 01:00 UTC
  $$
  SELECT cleanup_expired_rewards();
  $$
);

-- Verify the cron job was scheduled successfully
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-rewards') THEN
    RAISE NOTICE 'Cron job "cleanup-expired-rewards" scheduled successfully at 01:00 UTC daily';
  ELSE
    RAISE WARNING 'Failed to schedule cron job "cleanup-expired-rewards"';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON FUNCTION cleanup_expired_rewards IS 
'Deletes expired unclaimed rewards older than 7 days to keep database clean. Runs daily at 01:00 UTC via cron.';
