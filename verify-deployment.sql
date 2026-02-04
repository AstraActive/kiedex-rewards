-- Verify all migrations and configurations are working
-- Run this in Supabase SQL Editor to check everything

-- 1. Check if cron jobs are scheduled
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE jobname IN ('generate-daily-rewards', 'cleanup-expired-rewards');

-- Expected: 2 rows
-- generate-daily-rewards: 0 0 * * * (midnight UTC)
-- cleanup-expired-rewards: 0 1 * * * (1 AM UTC)

-- 2. Check app settings
SELECT * FROM app.settings;

-- Expected: 2 rows
-- supabase_url: https://oxjkyerdjhvxcqkbrlak.supabase.co
-- service_role_key: eyJhbG...

-- 3. Check system config table
SELECT * FROM public.system_config;

-- Expected: 4 rows
-- daily_pool_kdx: 10000
-- min_claim_amount: 0.01
-- reward_expiry_hours: 24
-- cleanup_after_days: 7

-- 4. Test get_config function
SELECT 
  get_config('daily_pool_kdx') as pool_size,
  get_config('reward_expiry_hours') as expiry_hours;

-- Expected: pool_size = '10000', expiry_hours = '24'

-- 5. Check if claim_reward RPC exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'claim_reward';

-- Expected: 1 row with function definition

-- 6. Check if add_counted_volume RPC exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'add_counted_volume';

-- Expected: 1 row with function definition

-- 7. Check if cleanup function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'cleanup_expired_rewards';

-- Expected: 1 row with function definition

-- 8. Check if daily_rewards_snapshot has expires_at column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_rewards_snapshot'
  AND column_name = 'expires_at';

-- Expected: 1 row (expires_at, timestamp with time zone)

-- 9. Check indexes on daily_rewards_snapshot
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'daily_rewards_snapshot'
  AND indexname LIKE '%expir%';

-- Expected: 1 row (idx_daily_rewards_snapshot_expiry)

-- 10. Summary - Everything is working if all queries return results
SELECT 
  'All systems operational!' as status,
  '✅ Migrations deployed' as migrations,
  '✅ Cron jobs scheduled' as cron_jobs,
  '✅ RPC functions created' as rpc_functions,
  '✅ Configuration ready' as configuration;
