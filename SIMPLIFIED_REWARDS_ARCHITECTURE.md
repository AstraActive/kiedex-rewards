# Daily Rewards - Simplified Architecture

## Overview
Daily rewards now work **without external triggers** by reading directly from `leaderboard_daily` when users claim. No edge functions, no GitHub Actions, no scheduling needed.

## How It Works

### 1. Trading Phase (All Day)
- Users trade on day `D`
- Volume tracked in `leaderboard_daily` with `date = D`

### 2. Claim Window (Next Day 05:00 UTC - 04:59:59 UTC)
- **Opens**: Day `D+1` at 05:00:00 UTC
- **Closes**: Day `D+2` at 04:59:59 UTC
- Users have ~24 hours to claim

### 3. Claiming Process
User clicks "Claim Rewards" → Frontend calls:
```typescript
supabase.rpc('claim_reward', {
  p_claim_date: '2026-02-07',  // Yesterday's date
  p_user_id: user.id,
  p_wallet_address: wallet
})
```

### 4. Backend Calculates On-the-Fly
The `claim_reward()` RPC function:
1. ✅ Validates claim window (05:00 UTC - 04:59:59 next day)
2. ✅ Checks if already claimed (unique constraint on `rewards_claims`)
3. ✅ Reads user's volume from `leaderboard_daily WHERE date = p_claim_date`
4. ✅ Calculates total pool volume for that date
5. ✅ Calculates reward: `(user_volume / total_volume) * 10000 KDX`
6. ✅ Inserts into `rewards_claims` (prevents double claims)
7. ✅ Updates user's KDX balance
8. ✅ Triggers referral bonus if applicable

## Frontend Flow

### Today's Estimate (Live Preview)
```typescript
// Shows current day's potential rewards (not claimable yet)
const estimatedRewards = (todayVolume / todayTotalVolume) * 10000;
```

### Yesterday's Claimable
```typescript
// After 05:00 UTC, shows yesterday's rewards (claimable)
const claimableRewards = (yesterdayVolume / yesterdayTotalVolume) * 10000;
const hasClaimableRewards = claimableRewards > 0 && !alreadyClaimed && afterResetTime;
```

## Architecture Benefits

✅ **No external dependencies** - No edge functions, no cron jobs  
✅ **Instant availability** - Rewards claimable immediately at 05:00 UTC  
✅ **Simpler codebase** - No snapshot table, no sync issues  
✅ **Self-contained** - Everything in database RPC  
✅ **Race condition safe** - Unique constraint prevents double claims  
✅ **Transaction safe** - All-or-nothing claim atomicity  

## Database Schema

### Tables Used
- `leaderboard_daily` - Source of truth for trading volume
- `rewards_claims` - Claim history (unique constraint prevents duplicates)
- `balances` - User KDX balances (updated on claim)
- `system_config` - Daily pool size configuration

### Deprecated Tables
- `daily_rewards_snapshot` - No longer used, can be dropped later

## Configuration

Change daily pool size:
```sql
UPDATE system_config 
SET value = '15000' 
WHERE key = 'daily_pool_kdx';
```

## Migration Path

1. ✅ Created new `claim_reward()` RPC (reads from leaderboard_daily)
2. ✅ Updated frontend `useRewards` hook
3. ✅ Deleted edge function directory
4. ✅ Deleted GitHub Actions workflow
5. ✅ Marked snapshot table as deprecated
6. ⏳ Test in production
7. ⏳ Drop snapshot table after confirming stability

## Testing Checklist

- [ ] User trades on day D
- [ ] Before 05:00 UTC on day D+1: Rewards NOT claimable
- [ ] After 05:00 UTC on day D+1: Rewards ARE claimable
- [ ] User claims successfully
- [ ] Balance updated correctly
- [ ] Second claim attempt fails with "Already claimed"
- [ ] After 04:59:59 UTC on day D+2: Claim fails with "Expired"
- [ ] Referral bonus paid correctly (8% of claim)

## Rollback Plan

If issues arise:
1. Revert migration `20260208000001_refactor_claim_to_leaderboard.sql`
2. Restore edge function from git history
3. Restore GitHub Actions workflow from git history
4. Revert frontend `useRewards.ts` from git history
5. Database automatically uses old `claim_reward()` signature

## Timeline Example

**Feb 7, 2026 (Trading Day)**
- User trades 1000 USDT volume
- `leaderboard_daily` entry created with `date = 2026-02-07`

**Feb 8, 2026 at 03:09 UTC**
- Rewards NOT yet available
- Frontend shows countdown: "Rewards available in X minutes"

**Feb 8, 2026 at 05:00 UTC**
- Countdown expires
- "Claim Rewards" button appears
- User clicks → Claim succeeds
- Balance updated immediately

**Feb 9, 2026 at 05:00 UTC**
- New claim window opens for Feb 8 trading
- Feb 7 rewards expire at 04:59:59 UTC


