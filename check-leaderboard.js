// Quick script to check leaderboard data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ffcsrzbwbuzhboyyloam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmY3NyemJ3YnV6aGJveXlsb2FtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczNDc4OSwiZXhwIjoyMDg0MzEwNzg5fQ.THmTeRYQflsrn0mgCWjd48Wfg7gv_rtlQ9tiGjEnnbw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('\n=== Checking Leaderboard Data ===\n');
  
  const now = new Date();
  const utcHour = now.getUTCHours();
  console.log(`Current UTC Time: ${now.toISOString()}`);
  console.log(`Current UTC Hour: ${utcHour}`);
  console.log(`\nReward Period Logic (00:00 UTC Reset):`);
  
  // With 00:00 UTC reset, current period is always today
  const currentPeriod = now.toISOString().split('T')[0];
  
  // Claimable period is always yesterday
  const claimDate = new Date(now);
  claimDate.setUTCDate(claimDate.getUTCDate() - 1);
  const claimablePeriod = claimDate.toISOString().split('T')[0];
  
  console.log(`- Current Trading Period: ${currentPeriod} (today's trading)`);
  console.log(`- Claimable Period: ${claimablePeriod} (yesterday's rewards)`);
  console.log(`- Claims Available: YES (anytime after 00:00 UTC)`);
  
  // Check current period data
  const { data: current, error: err1 } = await supabase
    .from('leaderboard_daily')
    .select('*')
    .eq('date', currentPeriod)
    .order('total_counted_volume', { ascending: false });
  
  console.log(`\n${currentPeriod} Data (Current Period - Estimated Rewards):`);
  if (err1) {
    console.error('Error:', err1);
  } else if (current.length === 0) {
    console.log('  ❌ NO DATA - No trading yet today');
  } else {
    console.log(`  ✅ Found ${current.length} entries`);
    current.forEach(entry => {
      console.log(`    - User: ${entry.user_id.substring(0, 8)}..., Volume: $${entry.total_counted_volume}, PnL: $${entry.total_pnl}, Trades: ${entry.trade_count}`);
    });
  }
  
  // Check claimable period data
  const { data: claimable, error: err2 } = await supabase
    .from('leaderboard_daily')
    .select('*')
    .eq('date', claimablePeriod)
    .order('total_counted_volume', { ascending: false });
  
  console.log(`\n${claimablePeriod} Data (Claimable Period - Ready to Claim):`);
  if (err2) {
    console.error('Error:', err2);
  } else if (claimable.length === 0) {
    console.log('  ❌ NO DATA - No rewards to claim');
  } else {
    console.log(`  ✅ Found ${claimable.length} entries`);
    claimable.forEach(entry => {
      console.log(`    - User: ${entry.user_id.substring(0, 8)}..., Volume: $${entry.total_counted_volume}, PnL: $${entry.total_pnl}, Trades: ${entry.trade_count}`);
    });
  }
  
  // Check rewards_claims
  const { data: claims, error: err3 } = await supabase
    .from('rewards_claims')
    .select('*')
    .order('claim_date', { ascending: false })
    .limit(10);
  
  console.log('\nRecent Reward Claims:');
  if (err3) {
    console.error('Error:', err3);
  } else if (claims.length === 0) {
    console.log('  ❌ NO claims found');
  } else {
    console.log(`  ✅ Found ${claims.length} claims`);
    claims.forEach(claim => {
      console.log(`    - Date: ${claim.claim_date}, Amount: ${claim.amount} KDX, Volume: $${claim.volume_score}`);
    });
  }
  
  console.log('\n');
}

checkData().catch(console.error);
