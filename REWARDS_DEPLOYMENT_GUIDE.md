# Rewards System Deployment Guide

**Project:** KieDex Trading Platform  
**Date:** February 3, 2026  
**Status:** Ready for Deployment

---

## 📋 What's Been Fixed

### Phase 1 - Critical Fixes (COMPLETED)
1. ✅ Added `expires_at` column to track reward expiry
2. ✅ Automated daily reward generation with pg_cron
3. ✅ Built expiry countdown UI with progress bars
4. ✅ Fixed race condition in volume cap with atomic RPC

### Phase 2 - Important Fixes (COMPLETED)
5. ✅ Fixed stale timestamp issue in expiry checks
6. ✅ Updated close-trade function to use RPC for thread-safe volume tracking

### Phase 3 - Polish Fixes (COMPLETED)
7. ✅ Cleanup job for expired rewards (runs daily at 01:00 UTC)
8. ✅ Database config table for system parameters
9. ✅ Transaction wrapping for atomic claim operations

**🎉 All 9 Issues Fixed - 100% Complete!**

---

## 🗂️ Files Modified

### Database Migrations (7 new files)
```
supabase/migrations/
  20260203000001_add_expires_at_to_rewards_snapshot.sql
  20260203000002_enable_pg_cron.sql
  20260203000003_schedule_daily_rewards.sql
  20260203000004_add_volume_cap_rpc.sql
  20260203000005_add_cleanup_job.sql
  20260203000006_add_system_config.sql
  20260203000007_add_claim_rpc.sql
```

### Frontend Files (2 files)
```
src/hooks/useRewards.ts          - Atomic claim RPC, stale timestamp fix
src/pages/Rewards.tsx            - Added expiry countdown UI
```

### Backend Files (2 files)
```
supabase/functions/close-trade/index.ts         - Uses volume cap RPC
supabase/functions/generate-daily-rewards/index.ts - Uses database config
```

---

## 🚀 Deployment Steps

### Step 1: Apply Database Migrations

**For Development Environment:**
```bash
# Reset database (applies all migrations)
supabase db reset
```

**For Production Environment:**
```bash
# Push only new migrations
supabase db push
```

**Expected Migrations Applied (7 files):**
1. `20260203000001_add_expires_at_to_rewards_snapshot.sql` - Adds expiry tracking
2. `20260203000002_enable_pg_cron.sql` - Enables cron extension
3. `20260203000003_schedule_daily_rewards.sql` - Schedules daily generation
4. `20260203000004_add_volume_cap_rpc.sql` - Atomic volume cap function
5. `20260203000005_add_cleanup_job.sql` - Cleanup expired rewards
6. `20260203000006_add_system_config.sql` - Config table for parameters
7. `20260203000007_add_claim_rpc.sql` - Atomic claim transaction

**Verify Migrations Applied:**
```sql
-- 1. Check expires_at column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_rewards_snapshot' 
  AND column_name = 'expires_at';

-- 2. Check pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 3. Check cron jobs are scheduled (2 jobs)
SELECT jobname, schedule, active FROM cron.job 
WHERE jobname IN ('generate-daily-rewards', 'cleanup-expired-rewards');

-- 4. Check RPC functions exist (2 functions)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('add_counted_volume', 'claim_reward');

-- 5. Check system_config table exists
SELECT key, value, description 
FROM system_config 
ORDER BY key;

-- 6. Check cleanup function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'cleanup_expired_rewards';
```

**Expected Results:**
- ✅ expires_at column: `timestamp with time zone`
- ✅ pg_cron: 1 row returned
- ✅ Cron jobs: 2 rows (generate-daily-rewards, cleanup-expired-rewards)
- ✅ RPC functions: 2 rows (add_counted_volume, claim_reward)
- ✅ system_config: 4 rows (daily_pool_kdx, min_claim_amount, reward_expiry_hours, cleanup_after_days)
- ✅ cleanup function: 1 row

---

### Step 2: Configure Service Role Key and Supabase URL

The cron job needs both the service role key and Supabase URL to call the edge function.

**Option A: Via Supabase Dashboard**
1. Go to: Database → Settings
2. Add these configurations:
   ```sql
   -- Create settings schema and table
   CREATE SCHEMA IF NOT EXISTS app;
   
   CREATE TABLE IF NOT EXISTS app.settings (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );
   
   -- Insert Supabase URL (replace with your actual project URL)
   INSERT INTO app.settings (key, value)
   VALUES ('supabase_url', 'https://YOUR_PROJECT_ID.supabase.co')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
   
   -- Insert service role key (replace with your actual service role key)
   INSERT INTO app.settings (key, value)
   VALUES ('service_role_key', 'YOUR_SERVICE_ROLE_KEY_HERE')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
   ```

**Option B: Via SQL**
```sql
-- Create settings table if it doesn't exist
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert Supabase URL
-- Get from: Supabase Dashboard → Settings → API → Project URL
INSERT INTO app.settings (key, value)
VALUES ('supabase_url', 'https://ffcsrzbwbuzhboyyloam.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Insert service role key
-- Get from: Supabase Dashboard → Settings → API → service_role key
INSERT INTO app.settings (key, value)
VALUES ('service_role_key', 'eyJhbGc...')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

**Where to Find Values:**
- **Supabase URL:** Dashboard → Settings → API → Project URL
- **Service Role Key:** Dashboard → Settings → API → `service_role` key (NOT the `anon` key)
- ⚠️ **NEVER commit service_role_key to git or expose to frontend**

**Verify Configuration:**
```sql
SELECT key, LEFT(value, 20) || '...' as value_preview
FROM app.settings
WHERE key IN ('supabase_url', 'service_role_key');
```

Expected output:
```
key              | value_preview
-----------------+------------------------
supabase_url     | https://ffcsrzbwbu...
service_role_key | eyJhbGciOiJIUzI1Ni...
```

---

### Step 3: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individual functions
supabase functions deploy close-trade
supabase functions deploy generate-daily-rewards
```

---

### Step 4: Test the System

#### 4.1 Test Reward Generation (Manual)

```bash
# Manually trigger the daily rewards generation
supabase functions invoke generate-daily-rewards --method POST
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Daily rewards generated successfully",
  "data": {
    "date": "2026-02-03",
    "usersRewarded": 15,
    "totalPoolDistributed": 10000,
    "expiresAt": "2026-02-04T23:59:59.000Z"
  }
}
```

**Verify in Database:**
```sql
-- Check latest rewards snapshot
SELECT 
  user_id,
  reward_date,
  reward_amount,
  expires_at,
  is_claimed
FROM daily_rewards_snapshot
WHERE reward_date = CURRENT_DATE - INTERVAL '1 day'
ORDER BY reward_amount DESC
LIMIT 10;
```

#### 4.2 Test Volume Cap RPC

```sql
-- Test the add_counted_volume function
SELECT * FROM add_counted_volume(
  p_user_id := '00000000-0000-0000-0000-000000000000'::UUID,
  p_date := CURRENT_DATE,
  p_volume := 1000.00,
  p_max_cap := 50000.00
);

-- Expected result:
-- counted_volume | capped | reason
-- 1000.00        | false  | NULL

-- Test with volume over cap
SELECT * FROM add_counted_volume(
  p_user_id := '00000000-0000-0000-0000-000000000000'::UUID,
  p_date := CURRENT_DATE,
  p_volume := 60000.00,
  p_max_cap := 50000.00
);

-- Expected result:
-- counted_volume | capped | reason
-- 50000.00       | true   | daily_cap_reached
```

#### 4.3 Test Claim RPC (Atomic Transaction)

```sql
-- First, create a test snapshot
INSERT INTO daily_rewards_snapshot (
  user_id, reward_date, volume_score, total_pool_volume, 
  reward_amount, is_claimed, expires_at
) VALUES (
  auth.uid(),
  CURRENT_DATE - INTERVAL '1 day',
  1000,
  10000,
  100,
  false,
  CURRENT_DATE + INTERVAL '1 day'
) RETURNING id;

-- Test atomic claim (replace snapshot_id with actual ID from above)
SELECT * FROM claim_reward(
  p_snapshot_id := 'YOUR_SNAPSHOT_ID'::UUID,
  p_user_id := auth.uid(),
  p_wallet_address := '0x1234...'
);

-- Expected result:
-- success | claim_id | reward_amount | new_kdx_balance | message
-- true    | uuid...  | 100.00        | 100.00          | Reward claimed successfully

-- Verify claim cannot be duplicated
SELECT * FROM claim_reward(
  p_snapshot_id := 'SAME_SNAPSHOT_ID'::UUID,
  p_user_id := auth.uid(),
  p_wallet_address := '0x1234...'
);

-- Expected result:
-- success | claim_id | reward_amount | new_kdx_balance | message
-- false   | NULL     | 100.00        | 0.00            | Reward already claimed
```

#### 4.4 Test Cron Jobs

```sql
-- Check if both cron jobs are scheduled
SELECT 
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname IN ('generate-daily-rewards', 'cleanup-expired-rewards');

-- Expected results:
-- jobname                    | schedule    | active
-- generate-daily-rewards     | 0 0 * * *   | true   (runs at 00:00 UTC)
-- cleanup-expired-rewards    | 0 1 * * *   | true   (runs at 01:00 UTC)

-- Check cron job execution history
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid IN (
  SELECT jobid 
  FROM cron.job 
  WHERE jobname IN ('generate-daily-rewards', 'cleanup-expired-rewards')
)
ORDER BY start_time DESC
LIMIT 10;
```

**Note:** First automatic run will be at:
- Reward generation: 00:00 UTC tonight
- Cleanup: 01:00 UTC tonight

Monitor logs tomorrow morning.

#### 4.4 Test Frontend UI

1. **Open Rewards Page**
   - Navigate to `/rewards` in the app
   - Should see expiry countdown timer
   - Progress bar should show time remaining

2. **Test Expiry States**
   - **Normal State** (>6 hours): Green progress bar
   - **Warning State** (<6 hours): Orange "Expiring Soon" badge
   - **Critical State** (<25%): Red progress bar
   - **Expired State**: Red warning message, claim button disabled

3. **Test Atomic Claiming**
   - Click "Claim Rewards" button
   - Should see success toast
   - Balance should update immediately
   - Reward should disappear from list
   - **Atomic guarantee:** All 3 operations succeed or all fail together
   - Cannot double-claim (button disabled after first claim)

4. **Test System Config**
   - Daily pool size should be configurable
   - Change pool size: `UPDATE system_config SET value = '15000' WHERE key = 'daily_pool_kdx';`
   - Next reward generation will use new value
   - No code deployment needed! ✅

---

## 🔍 Monitoring & Validation

### Daily Checks (First Week)

**Check 1: Cron Execution (Every morning after 00:05 UTC)**
```sql
-- Check reward generation
SELECT 
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time as duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-rewards')
  AND start_time::date = CURRENT_DATE
ORDER BY start_time DESC
LIMIT 1;

-- Check cleanup job (after 01:05 UTC)
SELECT 
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-rewards')
  AND start_time::date = CURRENT_DATE
ORDER BY start_time DESC
LIMIT 1;
```

**Expected:** 
- Reward generation: `status = 'succeeded'`, duration ~1-5 seconds
- Cleanup: `status = 'succeeded'`, completed at ~01:00 UTC

**Check 2: Rewards Created**
```sql
SELECT COUNT(*) as users_rewarded, SUM(reward_amount) as total_distributed
FROM daily_rewards_snapshot
WHERE reward_date = CURRENT_DATE - INTERVAL '1 day';
```

**Expected:** Users with volume > 0, total = 10,000 KDX (or configured value)

**Check 3: Expiry Dates**
```sql
SELECT 
  reward_date,
  MIN(expires_at) as earliest_expiry,
  MAX(expires_at) as latest_expiry,
  COUNT(*) as total_rewards,
  COUNT(*) FILTER (WHERE is_claimed = false) as unclaimed
FROM daily_rewards_snapshot
WHERE is_claimed = false OR claimed_at > NOW() - INTERVAL '1 day'
GROUP BY reward_date
ORDER BY reward_date DESC
LIMIT 5;
```

**Expected:** All `expires_at` should be end of day (23:59:59) on reward_date + 1 day

**Check 4: Volume Cap Enforcement**
```sql
SELECT 
  user_id,
  date,
  total_counted_volume,
  CASE 
    WHEN total_counted_volume >= 50000 THEN '🔴 At Cap'
    WHEN total_counted_volume >= 45000 THEN '🟡 Near Cap'
    ELSE '🟢 Normal'
  END as status
FROM leaderboard_daily
WHERE date = CURRENT_DATE
  AND total_counted_volume > 0
ORDER BY total_counted_volume DESC
LIMIT 20;
```

**Expected:** No user should exceed $50,000

**Check 5: Cleanup Working**
```sql
-- Check for old expired unclaimed rewards (should be deleted after 7 days)
SELECT 
  COUNT(*) as old_expired_rewards,
  MIN(expires_at) as oldest_expiry
FROM daily_rewards_snapshot
WHERE is_claimed = false
  AND expires_at < NOW() - INTERVAL '7 days';
```

**Expected:** `old_expired_rewards = 0` (cleanup job deletes them)

**Check 6: Claim Success Rate**
```sql
-- Check claim statistics for yesterday
SELECT 
  COUNT(*) FILTER (WHERE is_claimed = true) as claimed,
  COUNT(*) FILTER (WHERE is_claimed = false AND expires_at > NOW()) as pending,
  COUNT(*) FILTER (WHERE is_claimed = false AND expires_at < NOW()) as expired,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_claimed = true) / NULLIF(COUNT(*), 0), 2) as claim_rate_percent
FROM daily_rewards_snapshot
WHERE reward_date = CURRENT_DATE - INTERVAL '1 day';
```

**Expected:** 
- Claim rate >80% is good
- <50% may indicate UX issues or user engagement problems

---

## ⚠️ Troubleshooting

### Issue: Cron job not running

**Symptoms:**
- No new rewards snapshots created
- `cron.job_run_details` shows no recent runs

**Diagnosis:**
```sql
-- Check if job exists and is active
SELECT * FROM cron.job WHERE jobname = 'generate-daily-rewards';

-- Check for errors
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-rewards')
ORDER BY start_time DESC LIMIT 5;
```

**Solutions:**
1. Verify pg_cron extension enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Check service_role_key configured: `SELECT value FROM app.settings WHERE key = 'service_role_key';`
3. Manually test edge function: `supabase functions invoke generate-daily-rewards`
4. Check Supabase logs in dashboard

---

### Issue: Volume cap not enforced (race condition)

**Symptoms:**
- Users have > $50,000 counted volume
- Multiple concurrent trades bypassed cap

**Diagnosis:**
```sql
-- Check for users over cap
SELECT user_id, date, total_counted_volume
FROM leaderboard_daily
WHERE total_counted_volume > 50000
ORDER BY total_counted_volume DESC;
```

**Solutions:**
1. Verify RPC function deployed: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'add_counted_volume';`
2. Check close-trade function using RPC (not direct UPDATE)
3. Redeploy close-trade function: `supabase functions deploy close-trade`

---

### Issue: Claim fails with transaction error

**Symptoms:**
- User clicks claim but gets "Failed to claim reward"
- Partial state (snapshot marked claimed but no balance update)

**Diagnosis:**
```sql
-- Check for orphaned claims (marked claimed but no balance update)
SELECT 
  s.id,
  s.user_id,
  s.reward_amount,
  s.is_claimed,
  s.claimed_at,
  c.id as claim_record_id,
  b.kdx_balance
FROM daily_rewards_snapshot s
LEFT JOIN rewards_claims c ON c.user_id = s.user_id AND c.claim_date = s.reward_date
LEFT JOIN balances b ON b.user_id = s.user_id
WHERE s.is_claimed = true
  AND c.id IS NULL;
```

**Solutions:**
1. Verify claim_reward RPC exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'claim_reward';`
2. Check frontend using RPC (not multiple operations)
3. Manually fix orphaned claims:
```sql
-- Reset orphaned snapshot to allow re-claim
UPDATE daily_rewards_snapshot
SET is_claimed = false, claimed_at = NULL
WHERE id = 'ORPHANED_SNAPSHOT_ID';
```

---

### Issue: Expiry countdown not showing

**Symptoms:**
- Rewards page shows rewards but no countdown timer
- No progress bar visible

**Diagnosis:**
```sql
-- Check if expires_at is populated
SELECT user_id, reward_date, expires_at, is_claimed
FROM daily_rewards_snapshot
WHERE is_claimed = false
ORDER BY created_at DESC
LIMIT 10;
```

**Solutions:**
1. If `expires_at` is NULL: Run migration #1 again
2. If `expires_at` exists but UI not showing: Check browser console for errors
3. Verify `useRewards.ts` returning `expiresAt` and `getTimeRemaining`
4. Clear browser cache and refresh

---

### Issue: Claims failing with "expired" error

**Symptoms:**
- User clicks claim but gets "Claim window has expired"
- Countdown shows time remaining but claim still fails

**Diagnosis:**
```sql
-- Check current time vs expiry
SELECT 
  user_id,
  reward_date,
  expires_at,
  NOW() as current_time,
  expires_at - NOW() as time_remaining
FROM daily_rewards_snapshot
WHERE user_id = 'AFFECTED_USER_ID'
  AND is_claimed = false;
```

**Solutions:**
1. If `time_remaining` is negative: Reward actually expired, expected behavior
2. If `time_remaining` is positive: Frontend using stale timestamp
   - Verify migration applied and `useRewards.ts` has `now` inside queryFn
   - Hard refresh browser (Ctrl+Shift+R)
3. Check server time vs client time (timezone issues)

---

## 🎯 Success Criteria

Before marking deployment complete, verify:

- [ ] ✅ All 7 migrations applied successfully
- [ ] ✅ pg_cron extension enabled
- [ ] ✅ 2 cron jobs scheduled (generate + cleanup)
- [ ] ✅ Service role key configured in app.settings
- [ ] ✅ Supabase URL configured in app.settings
- [ ] ✅ Manual reward generation works
- [ ] ✅ Volume cap RPC function works (test with SQL)
- [ ] ✅ Claim RPC function works (atomic transaction)
- [ ] ✅ Edge functions deployed (close-trade, generate-daily-rewards)
- [ ] ✅ Expiry countdown shows on frontend
- [ ] ⏳ First automated cron run successful (wait until tomorrow 00:00 UTC)
- [ ] ⏳ Cleanup job runs successfully (wait until tomorrow 01:00 UTC)
- [ ] ⏳ Users can claim rewards successfully
- [ ] ⏳ No users exceed $50k volume cap
- [ ] ⏳ Expired rewards cannot be claimed
- [ ] ⏳ System config changes work without code deployment

---

## 📊 Metrics to Track

### Key Performance Indicators

1. **Reward Generation Success Rate**
   - Target: 100% daily
   - Alert if: Any day missed
   - Query:
   ```sql
   SELECT 
     DATE(start_time) as date,
     COUNT(*) as runs,
     COUNT(*) FILTER (WHERE status = 'succeeded') as succeeded,
     COUNT(*) FILTER (WHERE status = 'failed') as failed
   FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-rewards')
   GROUP BY DATE(start_time)
   ORDER BY date DESC
   LIMIT 30;
   ```

2. **Claim Rate**
   - Target: >80% within 24 hours
   - Alert if: <50% claims
   - Query:
   ```sql
   SELECT 
     reward_date,
     COUNT(*) as total_rewards,
     COUNT(*) FILTER (WHERE is_claimed = true) as claimed,
     ROUND(100.0 * COUNT(*) FILTER (WHERE is_claimed = true) / COUNT(*), 2) as claim_rate
   FROM daily_rewards_snapshot
   WHERE reward_date > CURRENT_DATE - INTERVAL '7 days'
   GROUP BY reward_date
   ORDER BY reward_date DESC;
   ```

3. **Expired Unclaimed Rewards (Waste)**
   - Target: <5% of total pool
   - Alert if: >10% waste
   - Query:
   ```sql
   SELECT 
     reward_date,
     SUM(reward_amount) FILTER (WHERE is_claimed = false AND expires_at < NOW()) as wasted,
     SUM(reward_amount) as total,
     ROUND(100.0 * SUM(reward_amount) FILTER (WHERE is_claimed = false AND expires_at < NOW()) / SUM(reward_amount), 2) as waste_percent
   FROM daily_rewards_snapshot
   WHERE reward_date > CURRENT_DATE - INTERVAL '30 days'
   GROUP BY reward_date
   ORDER BY reward_date DESC;
   ```

4. **Volume Cap Violations**
   - Target: 0 violations
   - Alert if: Any user >$50k
   - Query:
   ```sql
   SELECT 
     date,
     COUNT(*) FILTER (WHERE total_counted_volume > 50000) as violations,
     MAX(total_counted_volume) as highest_volume
   FROM leaderboard_daily
   WHERE date > CURRENT_DATE - INTERVAL '7 days'
   GROUP BY date
   ORDER BY date DESC;
   ```

5. **Cron Job Execution Time**
   - Target: <10 seconds
   - Alert if: >30 seconds
   - Query:
   ```sql
   SELECT 
     DATE(start_time) as date,
     jobname,
     AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration_seconds,
     MAX(EXTRACT(EPOCH FROM (end_time - start_time))) as max_duration_seconds
   FROM cron.job_run_details
   WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname IN ('generate-daily-rewards', 'cleanup-expired-rewards'))
     AND start_time > NOW() - INTERVAL '7 days'
   GROUP BY DATE(start_time), jobname
   ORDER BY date DESC;
   ```

6. **Cleanup Job Effectiveness**
   - Target: 100% of old expired rewards deleted
   - Query:
   ```sql
   SELECT COUNT(*) as should_be_zero
   FROM daily_rewards_snapshot
   WHERE is_claimed = false
     AND expires_at < NOW() - INTERVAL '7 days';
   ```

7. **Atomic Claim Success Rate**
   - Target: >99% success (no partial states)
   - Query:
   ```sql
   -- Check for orphaned claims (should be 0)
   SELECT COUNT(*) as orphaned_claims
   FROM daily_rewards_snapshot
   WHERE is_claimed = true
     AND claimed_at > NOW() - INTERVAL '7 days'
     AND NOT EXISTS (
       SELECT 1 FROM rewards_claims 
       WHERE rewards_claims.user_id = daily_rewards_snapshot.user_id
         AND rewards_claims.claim_date = daily_rewards_snapshot.reward_date
     );
   ```

8. **System Config Usage**
   - Track when pool size or other params are changed
   - Query:
   ```sql
   SELECT key, value, description, updated_at
   FROM system_config
   ORDER BY updated_at DESC;
   ```

---

## 🔄 Next Steps (Optional Enhancements)

### Phase 3 - Polish Items (Not Critical)

**Issue #7: Cleanup Job for Expired Rewards**
```sql
-- Auto-delete expired unclaimed rewards after 7 days
-- File: supabase/migrations/20260203000005_add_cleanup_job.sql
```

**Issue #8: Move Pool Size to Database Config**
```sql
-- Make 10,000 KDX configurable without code deploy
-- File: supabase/migrations/20260203000006_add_system_config.sql
```

**Issue #9: Transaction Wrapping for Claims**
```sql
-- Make claim process atomic with RPC
-- File: supabase/migrations/20260203000007_add_claim_rpc.sql
```

These can wait until after initial launch and monitoring phase.

---

## 📝 Rollback Plan

If critical issues arise after deployment:

### Option 1: Disable Cron Job
```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'generate-daily-rewards';
```
**Impact:** No new rewards generated, existing claims still work

### Option 2: Revert Migrations
```bash
# Find migration version before changes
supabase db reset --version 20260203000000

# Or manually drop changes
DROP FUNCTION IF EXISTS add_counted_volume;
ALTER TABLE daily_rewards_snapshot DROP COLUMN IF EXISTS expires_at;
```
**Impact:** System reverts to manual reward generation

### Option 3: Emergency Pool Pause
```sql
-- Set pool to 0 temporarily
UPDATE app.settings 
SET value = '0' 
WHERE key = 'daily_pool_size';
```
**Impact:** No rewards distributed until re-enabled

---

## 👥 Team Contacts

**Questions or Issues?**
- Database: Check Supabase Dashboard logs
- Edge Functions: `supabase functions logs close-trade`
- Frontend: Browser DevTools console

**Deployment Checklist Owner:** [Your Name]  
**Database Admin:** [DBA Name]  
**Backend Lead:** [Backend Lead Name]

---

**Last Updated:** February 3, 2026  
**Version:** 1.0  
**Status:** ✅ Ready for Production Deployment
