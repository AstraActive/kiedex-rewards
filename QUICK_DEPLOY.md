# Quick Deployment Checklist

**Use this checklist for rapid deployment of rewards system fixes.**

---

## ⚡ 5-Minute Deployment

### Step 1: Apply Migrations (2 min)
```bash
# Development
supabase db reset

# Production
supabase db push
```

### Step 2: Configure Service Key & URL (1 min)
```sql
-- In Supabase SQL Editor
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add Supabase URL (replace with YOUR project URL)
INSERT INTO app.settings (key, value)
VALUES ('supabase_url', 'https://YOUR_PROJECT_ID.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Add service role key (replace with YOUR key)
INSERT INTO app.settings (key, value)
VALUES ('service_role_key', 'YOUR_SERVICE_ROLE_KEY_HERE')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

> Get values from: Supabase Dashboard → Settings → API
> - Project URL: Use as `supabase_url`
> - Service Role Key: Use as `service_role_key` (NOT anon key)

### Step 3: Deploy Functions (1 min)
```bash
supabase functions deploy close-trade
```

### Step 4: Verify (1 min)
```bash
# Test reward generation
supabase functions invoke generate-daily-rewards --method POST

# Check cron job scheduled
```

```sql
SELECT * FROM cron.job WHERE jobname = 'generate-daily-rewards';
```

---

## ✅ Verification Commands

### Check Migration Success
```sql
-- 1. Check expires_at column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'daily_rewards_snapshot' AND column_name = 'expires_at';

-- 2. Check pg_cron enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 3. Check RPC function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'add_counted_volume';

-- 4. Check cron job active
SELECT jobname, active FROM cron.job WHERE jobname = 'generate-daily-rewards';
```

**Expected:** All 4 queries return results ✅

---

## 🧪 Quick Tests

### Test 1: Manual Reward Generation
```bash
supabase functions invoke generate-daily-rewards --method POST
```
**Expected:** `"success": true`

### Test 2: Volume Cap RPC
```sql
SELECT * FROM add_counted_volume(
  '00000000-0000-0000-0000-000000000000'::UUID,
  CURRENT_DATE,
  1000.00,
  50000.00
);
```
**Expected:** `counted_volume = 1000.00, capped = false`

### Test 3: Frontend UI
1. Open `/rewards` page
2. Look for countdown timer
3. Click "Claim Rewards"

**Expected:** Countdown visible, claim works ✅

---

## 🚨 Rollback (If Needed)

```sql
-- Disable cron job (keep everything else)
UPDATE cron.job SET active = false WHERE jobname = 'generate-daily-rewards';
```

---

## 📞 Need Help?

**Error:** `column "expires_at" does not exist`  
**Fix:** Migration not applied → Run `supabase db push`

**Error:** `function add_counted_volume does not exist`  
**Fix:** Migration not applied → Run `supabase db push`

**Error:** Cron job not running  
**Fix:** Service key or URL missing → Add both to `app.settings`

**Error:** `could not find app.settings.supabase_url`  
**Fix:** Add Supabase URL → Insert into `app.settings` table

**Error:** Frontend countdown not showing  
**Fix:** Hard refresh browser (Ctrl+Shift+R)

---

## 📋 Files Changed

- ✅ 4 new SQL migrations
- ✅ `src/hooks/useRewards.ts` - Timestamp fix
- ✅ `src/pages/Rewards.tsx` - Countdown UI
- ✅ `supabase/functions/close-trade/index.ts` - RPC usage

---

**Total Time:** ~5 minutes  
**Complexity:** Low  
**Risk:** Low (migrations are safe, rollback available)

**Full Guide:** See `REWARDS_DEPLOYMENT_GUIDE.md` for detailed instructions.
