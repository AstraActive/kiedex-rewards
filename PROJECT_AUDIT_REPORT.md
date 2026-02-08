# KieDex — Full Project Audit Report

**Date:** February 6, 2026  
**Status:** Issues Identified — Fixes In Progress

---

## Table of Contents

1. [Daily Rewards Not Claimable (ROOT CAUSE FOUND & FIXED)](#1-daily-rewards-not-claimable)
2. [Critical: Client-Side Balance Manipulation](#2-critical-client-side-balance-manipulation)
3. [Critical: Non-Atomic Trade Operations (Race Conditions)](#3-critical-non-atomic-trade-operations)
4. [High: No Auto-Liquidation Enforcement](#4-high-no-auto-liquidation-enforcement)
5. [High: MFA Backup Codes Not Hashed](#5-high-mfa-backup-codes-not-hashed)
6. [High: Wallet Ownership Not Verified](#6-high-wallet-ownership-not-verified)
7. [High: Wildcard CORS on Edge Functions](#7-high-wildcard-cors-on-edge-functions)
8. [High: Oil Conversion Rate Mismatch](#8-high-oil-conversion-rate-mismatch)
9. [High: Possibly Broken Auth Method in Edge Functions](#9-high-possibly-broken-auth-method)
10. [Medium: PnL & Liquidation Price Preview Mismatch](#10-medium-pnl--liquidation-price-preview-mismatch)
11. [Medium: Referral Bonus Race Condition](#11-medium-referral-bonus-race-condition)
12. [Medium: Hardcoded DAILY_POOL in Client](#12-medium-hardcoded-daily_pool-in-client)
13. [Medium: No Server-Side Symbol Whitelist](#13-medium-no-server-side-symbol-whitelist)
14. [Low: Timezone Inconsistency](#14-low-timezone-inconsistency)
15. [Low: WebSocket Reconnection No Backoff](#15-low-websocket-reconnection-no-backoff)
16. [Low: Edge Functions Return HTTP 200 for Errors](#16-low-edge-functions-return-http-200-for-errors)
17. [Low: Leaderboard No Pagination](#17-low-leaderboard-no-pagination)
18. [Security: Service Role Key Committed to Git](#18-security-service-role-key-in-git)

---

## 1. Daily Rewards Not Claimable

### Status: ✅ ROOT CAUSE FOUND & FIX CREATED

### Symptom
Users trade all day, see estimated rewards on the Rewards page, but after 24 hours everything resets to zero. No claimable rewards ever appear.

### Root Cause
The cron job that generates `daily_rewards_snapshot` records **never actually runs** because:

1. **`pg_net` extension is never enabled.** The cron function `call_generate_daily_rewards()` uses `net.http_post()` to call the `generate-daily-rewards` edge function. But no migration creates the `pg_net` extension. The function fails silently every night.

2. **Without snapshots, claimable rewards are always zero.** The client (`useRewards.ts`) queries `daily_rewards_snapshot` for unclaimed, non-expired rows. Since no rows exist, `claimableRewards = 0`.

3. **Estimated rewards disappear at midnight** because they're calculated from `leaderboard_daily` for `today`. When the date changes, `today` becomes the new date with zero volume. Yesterday's volume data exists but there's no snapshot pointing to it.

### Flow Diagram
```
User trades on Day 1
    ↓
Volume recorded in leaderboard_daily ✅
    ↓
Estimated rewards show on Rewards page ✅ (live calculation)
    ↓
Midnight UTC: pg_cron fires → call_generate_daily_rewards()
    ↓
Function calls net.http_post() → ❌ FAILS (pg_net not enabled)
    ↓
No daily_rewards_snapshot rows created ❌
    ↓
Day 2: Client queries snapshots → finds nothing → shows 0 KDX ❌
    ↓
Estimated rewards also show 0 (new day, no trades yet) ✅ (expected)
```

### Fix Applied
**Fixed in:** `supabase/migrations/20260203000003_schedule_daily_rewards.sql`

- Replaced the broken `call_generate_daily_rewards()` (which used `net.http_post()`) with a pure PL/pgSQL function `generate_daily_rewards_snapshot()` that calculates rewards directly in SQL — **no HTTP calls, no pg_net, no app.settings needed**
- Cron job now calls the SQL function directly at 00:05 UTC daily

**Fixed in:** `supabase/migrations/20260204000001_configure_app_settings.sql`

- Removed the `app.settings` table with the exposed service role key
- Removed the broken `trigger_daily_rewards_generation()` function
- Replaced with `admin_generate_rewards()` — an admin-only wrapper for manual testing

**Also fixed:** `configure-cron-settings.sql`

- Removed hardcoded service role key

### How to Deploy
Run this migration in Supabase SQL Editor:
1. `20260203000003_schedule_daily_rewards.sql` — Installs the fix

To test manually after deploying:
```sql
SELECT * FROM generate_daily_rewards_snapshot();
```

---

## 2. Critical: Client-Side Balance Manipulation

### Severity: 🔴 CRITICAL — Exploitable

### Description
Multiple hooks read the user's balance, add a reward amount, and write back to the `balances` table **from the client side** using direct Supabase `update` calls. A malicious user can intercept these requests and write any arbitrary balance.

### Affected Files
| File | What it does |
|---|---|
| `src/hooks/useSocialTasks.ts` | Social task reward: reads balance, adds reward, writes back |
| `src/hooks/useTasks.ts` | Daily task reward: reads balance, adds reward, writes back |
| `src/hooks/useVolumeMilestones.ts` | Volume milestone Oil claim: reads `oil_balance`, adds reward |
| `src/hooks/useDailyBonus.ts` | Daily bonus: reads `oil_balance`, adds bonus, writes back. Cooldown is client-only |

### Impact
A user can give themselves **unlimited USDT, Oil, or KDX** by modifying the client request payload.

### Recommended Fix
Move all balance mutations to **server-side RPC functions** (like `claim_reward` already does). The RPC should:
1. Validate the user is eligible
2. Check for duplicate claims
3. Atomically update the balance
4. Return the result

---

## 3. Critical: Non-Atomic Trade Operations

### Severity: 🔴 CRITICAL — Exploitable

### Description
**execute-trade:** Balance check (line ~201) and balance deduction (line ~259) are separate operations. Submitting multiple trades simultaneously allows all to pass the balance check before any deduct funds — **overdrawing the account**.

**close-trade:** History insert → position delete → balance update are sequential without a transaction. Concurrent closes on different positions read the same stale balance; one update overwrites the other — **user loses returned funds**.

### Affected Files
- `supabase/functions/execute-trade/index.ts`
- `supabase/functions/close-trade/index.ts`

### Recommended Fix
Wrap the entire trade execution and close flows in **database transactions** or use server-side RPC functions with `FOR UPDATE` row locks (similar to `claim_reward` and `add_counted_volume`).

---

## 4. High: No Auto-Liquidation Enforcement

### Severity: 🟠 HIGH

### Description
Liquidation prices are calculated and stored in `open_positions` but **never enforced**. No cron job, trigger, or background process checks if the mark price has crossed a position's liquidation price. Positions can remain open indefinitely with unbounded negative PnL.

### Affected Files
- `supabase/functions/execute-trade/index.ts` (calculates liquidation price)
- No enforcement mechanism exists

### Recommended Fix
Create a pg_cron job or edge function that periodically (every 30–60s) fetches current prices and auto-closes any positions where mark price has crossed the liquidation price.

---

## 5. High: MFA Backup Codes Not Hashed

### Severity: 🟠 HIGH

### Description
Backup codes are "hashed" with `btoa(code + user.id)` — this is **Base64 encoding, not hashing**. It's trivially reversible. Anyone with database read access can decode all backup codes and bypass MFA.

### Affected File
- `src/hooks/useMFA.ts` (line ~112)

### Recommended Fix
Use a proper one-way hash (e.g., SHA-256 or bcrypt) for backup codes. Compare by hashing the input and checking against stored hashes.

---

## 6. High: Wallet Ownership Not Verified

### Severity: 🟠 HIGH

### Description
When linking a wallet, the code reads the `address` from wagmi and writes it to `profiles.linked_wallet_address`. No **signature challenge** is issued. A modified client could submit any wallet address.

### Affected File
- `src/contexts/WalletContext.tsx` (line ~153–191)

### Recommended Fix
Implement a sign-message challenge: generate a nonce server-side, have the user sign it with their wallet, and verify the signature on the server before linking.

---

## 7. High: Wildcard CORS on Edge Functions

### Severity: 🟠 HIGH

### Description
All edge functions set `Access-Control-Allow-Origin: '*'`, allowing any website to make authenticated requests if the user has an active Supabase session.

### Affected Files
- All files in `supabase/functions/*/index.ts`

### Recommended Fix
Restrict CORS to known domains:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://kiedex.app',
  // ...
};
```

---

## 8. High: Oil Conversion Rate Mismatch

### Severity: 🟠 HIGH

### Description
- `get-deposit-config` returns `conversionRate: 100000000` (100M Oil/ETH)
- `verify-oil-deposit` uses `ETH_TO_OIL_RATE = 1500000000` (1.5B Oil/ETH)
- Frontend hardcodes `1500000000` (matches verify)

The config endpoint returns a **15x wrong** conversion rate.

### Affected Files
- `supabase/functions/get-deposit-config/index.ts`
- `supabase/functions/verify-oil-deposit/index.ts`

### Recommended Fix
Use a single source of truth (e.g., `system_config` table) for the conversion rate, read it in both functions.

---

## 9. High: Possibly Broken Auth Method

### Severity: 🟠 HIGH

### Description
`verify-oil-deposit` and `get-deposit-config` call `supabase.auth.getClaims(token)` — this is **not a documented method** in Supabase JS v2. If it doesn't exist at runtime, these functions return 500 errors, breaking oil deposits entirely.

### Affected Files
- `supabase/functions/verify-oil-deposit/index.ts`
- `supabase/functions/get-deposit-config/index.ts`

### Recommended Fix
Replace with `supabase.auth.getUser(token)` which is the standard v2 method.

---

## 10. Medium: PnL & Liquidation Price Preview Mismatch

### Severity: 🟡 MEDIUM

### Description
Frontend calculates unrealized PnL using `entry_price` (raw mark price), but server uses `entry_price_executed` (with slippage). Users see slightly inaccurate PnL. Similarly, the liquidation price preview in `OrderPanel.tsx` doesn't account for slippage.

### Affected Files
- `src/hooks/useOpenPositions.ts` (line ~56–60)
- `src/components/trading/OrderPanel.tsx` (line ~55–62)

---

## 11. Medium: Referral Bonus Race Condition

### Severity: 🟡 MEDIUM

### Description
`process-referral-bonus` checks for duplicate bonuses and inserts non-atomically. Rapid retries can cause **double bonus** payments.

### Affected File
- `supabase/functions/process-referral-bonus/index.ts`

---

## 12. Medium: Hardcoded DAILY_POOL in Client

### Severity: 🟡 MEDIUM

### Description
`useRewards.ts` hardcodes `DAILY_POOL = 10000`. The server reads the value from `system_config`. If the pool size is changed server-side, the client's estimated rewards will be wrong.

### Affected File
- `src/hooks/useRewards.ts` (line 8)

### Recommended Fix
Fetch the pool size from `system_config` via a query, or expose it through an API endpoint.

---

## 13. Medium: No Server-Side Symbol Whitelist

### Severity: 🟡 MEDIUM

### Description
`execute-trade` validates `symbol` only as a non-empty string. Users could submit exotic Binance pairs not intended for the platform.

### Affected File
- `supabase/functions/execute-trade/index.ts`

### Recommended Fix
Add a whitelist: `['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'LTCUSDT', 'DOGEUSDT', 'TRXUSDT', 'SHIBUSDT']`

---

## 14. Low: Timezone Inconsistency

### Severity: 🔵 LOW

### Description
Multiple hooks compute "today" using `new Date().toISOString().split('T')[0]` (UTC). Users near the UTC date boundary may see inconsistent daily task progress.

### Affected Files
- `src/hooks/useRewards.ts`, `useTasks.ts`, `useDailyBonus.ts`, `useVolumeMilestones.ts`

---

## 15. Low: WebSocket Reconnection No Backoff

### Severity: 🔵 LOW

### Description
Binance WebSocket reconnects on a fixed 3s delay forever. No exponential backoff or max retry limit.

### Affected File
- `src/services/binance.ts`

---

## 16. Low: Edge Functions Return HTTP 200 for Errors

### Severity: 🔵 LOW

### Description
`execute-trade` and `close-trade` return `status: 200` with `{ success: false }` for all errors. Standard monitoring tools won't detect failures.

### Affected Files
- `supabase/functions/execute-trade/index.ts`
- `supabase/functions/close-trade/index.ts`

---

## 17. Low: Leaderboard No Pagination

### Severity: 🔵 LOW

### Description
Weekly/monthly leaderboard fetches ALL `leaderboard_daily` entries for the date range without limit, then aggregates in JavaScript. Will degrade with user growth.

### Affected File
- `src/hooks/useLeaderboard.ts`

---

## 18. Security: Service Role Key in Git

### Severity: 🔴 CRITICAL (Security)

### Description
The Supabase **service role key** is hardcoded in plain text in:
- `supabase/migrations/20260204000001_configure_app_settings.sql`
- `configure-cron-settings.sql`

This key grants **full admin access** to the database, bypassing all RLS. If this repo is public or shared, the key is compromised.

### Recommended Fix
1. **Immediately rotate** the service role key in Supabase dashboard
2. Remove the key from these files
3. Add `*.sql` sensitive files to `.gitignore` or use environment variables
4. The new fix (migration `20260206000001`) eliminates the need for storing the service role key in the database entirely

---

## Summary

| Severity | Count | Key Items |
|---|---|---|
| 🔴 Critical | 3 | Client-side balance manipulation, non-atomic trades, exposed service key |
| 🟠 High | 6 | No liquidation, MFA codes, wallet verification, CORS, rate mismatch, broken auth |
| 🟡 Medium | 4 | PnL mismatch, referral race condition, hardcoded pool, no symbol whitelist |
| 🔵 Low | 4 | Timezone, WS backoff, HTTP status codes, leaderboard pagination |
| ✅ Fixed | 1 | Daily rewards not generating (cron job fix + backfill) |
