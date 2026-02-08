import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const SLIPPAGE_RATE = 0.0003; // 0.03%
const MIN_OPEN_TIME_SECONDS = 30;
const MIN_POSITION_SIZE_USDT = 5;
const DAILY_VOLUME_CAP = 50000;
const BINANCE_API_TIMEOUT_MS = 5000; // 5 second timeout
const BINANCE_MAX_RETRIES = 2; // Retry up to 2 times
const BINANCE_RETRY_DELAY_MS = 500; // 500ms delay between retries
const REWARD_RESET_HOUR_UTC = 0; // Daily reset at 00:00 UTC

interface CloseTradeRequest {
  positionId: string;
}

/**
 * Calculate the reward period date based on 00:00 UTC reset window.
 * Trading period "Day D": Day D 00:00 UTC → Day D 23:59:59 UTC
 * Claimable: Day D+1 at 00:00 UTC onwards
 * 
 * Examples:
 * - Trade at Feb 8 10:00 UTC → Period "2026-02-08" → Claim Feb 9 00:00+
 * - Trade at Feb 8 23:30 UTC → Period "2026-02-08" → Claim Feb 9 00:00+
 * - Trade at Feb 9 00:30 UTC → Period "2026-02-09" → Claim Feb 10 00:00+
 */
function getRewardPeriodDate(timestamp: Date): string {
  // With 00:00 UTC reset, trades always belong to current UTC date
  // No adjustment needed - just return the UTC date
  return timestamp.toISOString().split('T')[0];
}

async function fetchBinancePrice(symbol: string): Promise<number> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= BINANCE_MAX_RETRIES; attempt++) {
    try {
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), BINANCE_API_TIMEOUT_MS);
      
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`Binance API error (attempt ${attempt + 1}): ${response.status} ${response.statusText}`);
        throw new Error(`Binance API returned ${response.status}`);
      }
      
      const data = await response.json();
      const price = parseFloat(data.price);
      
      if (isNaN(price) || price <= 0) {
        throw new Error('Invalid price data from Binance');
      }
      
      console.log(`Binance price fetched for ${symbol}: ${price} (attempt ${attempt + 1})`);
      return price;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Binance fetch attempt ${attempt + 1} failed:`, lastError.message);
      
      // Don't retry on abort (timeout) errors after last attempt
      if (attempt < BINANCE_MAX_RETRIES) {
        await new Promise(r => setTimeout(r, BINANCE_RETRY_DELAY_MS));
      }
    }
  }
  
  console.error('All Binance API attempts failed:', lastError?.message);
  throw new Error('Failed to fetch market price. Please try again.');
}

function calculateCountedVolume(
  openTimeSeconds: number,
  positionSizeUsdt: number,
  currentDailyVolume: number
): { countedVolume: number; reason: string | null } {
  // Check minimum open time
  if (openTimeSeconds < MIN_OPEN_TIME_SECONDS) {
    return { countedVolume: 0, reason: 'too_fast' };
  }

  // Check minimum position size
  if (positionSizeUsdt < MIN_POSITION_SIZE_USDT) {
    return { countedVolume: 0, reason: 'too_small' };
  }

  // Calculate weighted volume based on open time
  let weight = 1.0;
  if (openTimeSeconds >= 30 && openTimeSeconds < 60) {
    weight = 0.5; // 50% for 30-60 seconds
  } else if (openTimeSeconds >= 60 && openTimeSeconds < 180) {
    weight = 0.75; // 75% for 60-180 seconds
  }
  // 100% for 180+ seconds

  let countedVolume = positionSizeUsdt * weight;

  // Apply daily cap
  const remainingCap = Math.max(0, DAILY_VOLUME_CAP - currentDailyVolume);
  if (countedVolume > remainingCap) {
    countedVolume = remainingCap;
    if (remainingCap === 0) {
      return { countedVolume: 0, reason: 'daily_cap_reached' };
    }
  }

  return { countedVolume, reason: null };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Verify user has a linked wallet (anti-spam check)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('linked_wallet_address')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.linked_wallet_address) {
      console.error('No linked wallet for close trade:', user.id);
      throw new Error('No wallet linked to account. Please connect your wallet first.');
    }

    // Parse request body
    const { positionId }: CloseTradeRequest = await req.json();

    if (!positionId) {
      throw new Error('Missing position ID');
    }

    // Get the position
    const { data: position, error: posError } = await supabase
      .from('open_positions')
      .select('*')
      .eq('id', positionId)
      .eq('user_id', user.id)
      .single();

    if (posError || !position) {
      throw new Error('Position not found');
    }

    // Fetch real-time price from Binance with retry logic
    const markPrice = await fetchBinancePrice(position.symbol);
    if (markPrice <= 0) {
      throw new Error('Invalid market price');
    }

    // Apply exit slippage based on side
    // LONG: exit_price_executed = base_price * (1 - slippage_rate) - worse price
    // SHORT: exit_price_executed = base_price * (1 + slippage_rate) - worse price
    const exitPriceExecuted = position.side === 'long'
      ? markPrice * (1 - SLIPPAGE_RATE)
      : markPrice * (1 + SLIPPAGE_RATE);

    // Use executed entry price if available
    const entryPriceExecuted = position.entry_price_executed || position.entry_price;

    // Calculate realized PnL using executed prices
    let realizedPnl: number;
    if (position.side === 'long') {
      realizedPnl = (exitPriceExecuted - entryPriceExecuted) * position.position_size;
    } else {
      realizedPnl = (entryPriceExecuted - exitPriceExecuted) * position.position_size;
    }

    // Calculate open time
    const openedAt = new Date(position.opened_at);
    const closedAt = new Date();
    const openTimeSeconds = Math.floor((closedAt.getTime() - openedAt.getTime()) / 1000);

    // Calculate position size in USDT
    const positionSizeUsdt = position.position_size * entryPriceExecuted;

    // Calculate raw counted volume with anti-spam rules (before daily cap)
    const { countedVolume: rawCountedVolume, reason: spamReason } = calculateCountedVolume(
      openTimeSeconds,
      positionSizeUsdt,
      0 // Don't pass current volume here - let RPC handle the cap
    );

    // Use RPC to atomically add counted volume with daily cap enforcement
    // Use reward period date (based on 05:00 UTC reset) instead of calendar date
    const rewardPeriod = getRewardPeriodDate(closedAt);
    const { data: volumeResult, error: volumeError } = await supabase
      .rpc('add_counted_volume', {
        p_user_id: user.id,
        p_date: rewardPeriod,
        p_volume: rawCountedVolume,
        p_max_cap: DAILY_VOLUME_CAP,
      });

    if (volumeError) {
      console.error('Volume RPC error:', volumeError);
      throw new Error('Failed to update counted volume');
    }

    const { counted_volume: countedVolume, capped, reason: capReason } = volumeResult || {};
    const finalReason = spamReason || (capped ? capReason : null);
    
    // Fallback if RPC didn't return expected data
    const safeCountedVolume = countedVolume ?? 0;

    // Insert into trades_history
    const { error: historyError } = await supabase
      .from('trades_history')
      .insert({
        user_id: user.id,
        symbol: position.symbol,
        side: position.side,
        leverage: position.leverage,
        margin: position.margin,
        position_size: position.position_size,
        entry_price: position.entry_price,
        entry_price_executed: entryPriceExecuted,
        exit_price: markPrice,
        exit_price_executed: exitPriceExecuted,
        realized_pnl: realizedPnl,
        fee_paid: position.fee_paid,
        status: 'closed',
        opened_at: position.opened_at,
        closed_at: closedAt.toISOString(),
        slippage_rate: SLIPPAGE_RATE,
        open_time_seconds: openTimeSeconds,
        counted_volume: safeCountedVolume,
        counted_volume_reason: finalReason,
      });

    if (historyError) {
      console.error('History insert error:', historyError);
      throw new Error('Failed to record trade history');
    }

    // Delete the open position
    const { error: deleteError } = await supabase
      .from('open_positions')
      .delete()
      .eq('id', positionId);

    if (deleteError) {
      console.error('Position delete error:', deleteError);
      throw new Error('Failed to close position');
    }

    // Update user's balance (return margin + PnL)
    const { data: balances, error: balError } = await supabase
      .from('balances')
      .select('demo_usdt_balance')
      .eq('user_id', user.id)
      .single();

    if (balError || !balances) {
      throw new Error('Failed to fetch balances');
    }

    const newBalance = balances.demo_usdt_balance + position.margin + realizedPnl;
    const { error: updateError } = await supabase
      .from('balances')
      .update({ demo_usdt_balance: Math.max(0, newBalance) })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Balance update error:', updateError);
      throw new Error('Failed to update balance');
    }

    // Update daily tasks progress
    try {
      // Use reward period date for consistent daily task tracking
      const rewardPeriod = getRewardPeriodDate(closedAt);
      
      // Task 1: Complete 3 trades today (trade_3)
      await supabase.rpc('increment_task_progress', {
        p_user_id: user.id,
        p_task_id: 'trade_3',
        p_date: rewardPeriod,
        p_increment: 1,
        p_target: 3,
      });

      // Task 2: Trade $1,000 volume today (volume_1000)
      await supabase.rpc('increment_task_progress', {
        p_user_id: user.id,
        p_task_id: 'volume_1000',
        p_date: rewardPeriod,
        p_increment: positionSizeUsdt,
        p_target: 1000,
      });

      // Task 3: Win 2 profitable trades (win_2)
      if (realizedPnl > 0) {
        await supabase.rpc('increment_task_progress', {
          p_user_id: user.id,
          p_task_id: 'win_2',
          p_date: rewardPeriod,
          p_increment: 1,
          p_target: 2,
        });
      }
    } catch (taskError) {
      // Don't fail the trade if task tracking fails
      console.error('Task progress update failed:', taskError);
    }

    console.log(`Trade closed: ${position.side.toUpperCase()} ${position.symbol} | Entry: ${entryPriceExecuted} | Exit: ${exitPriceExecuted} | PnL: ${realizedPnl.toFixed(2)} | Open Time: ${openTimeSeconds}s | Counted Volume: ${safeCountedVolume.toFixed(2)} (${finalReason || 'valid'}) | Wallet: ${profile.linked_wallet_address}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          symbol: position.symbol,
          side: position.side,
          markPrice,
          entryPriceExecuted,
          exitPriceExecuted,
          realizedPnl,
          openTimeSeconds,
          countedVolume: safeCountedVolume,
          countedVolumeReason: finalReason,
          slippageRate: SLIPPAGE_RATE,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Close trade error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 so SDK passes through the actual error message
      }
    );
  }
});
