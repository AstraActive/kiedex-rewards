import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLIPPAGE_RATE = 0.0003; // 0.03%
const BINANCE_API_TIMEOUT_MS = 5000; // 5 second timeout
const BINANCE_MAX_RETRIES = 2; // Retry up to 2 times
const BINANCE_RETRY_DELAY_MS = 500; // 500ms delay between retries

interface ExecuteTradeRequest {
  symbol: string;
  side: 'long' | 'short';
  leverage: number;
  margin: number;
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Helper to return success response (always 200)
  const successResponse = (data: unknown) => {
    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  };

  // Helper to return error response (always 200 to prevent SDK wrapping)
  const errorResponse = (message: string, details?: unknown) => {
    console.error('❌ Execute trade error:', { message, details });
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 so SDK passes through the actual error message
      }
    );
  };

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header');
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
      console.error('❌ Auth error:', authError?.message || 'No user found');
      return errorResponse('Not authenticated. Please log in again.');
    }

    console.log('📦 Execute trade - User authenticated:', user.id);

    // Verify user has a linked wallet (anti-spam check)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('linked_wallet_address')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError);
      return errorResponse('Failed to verify wallet. Please try again.');
    }

    if (!profile?.linked_wallet_address) {
      console.error('❌ No linked wallet for user:', user.id);
      return errorResponse('No wallet linked to account. Please connect your wallet first.');
    }

    console.log('📦 Wallet verified:', profile.linked_wallet_address);

    // Rate limiting: Check trades opened in last 5 seconds (max 3)
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentTrades, error: rateError } = await supabase
      .from('open_positions')
      .select('opened_at')
      .eq('user_id', user.id)
      .gte('opened_at', fiveSecondsAgo);

    if (rateError) {
      console.error('❌ Rate limit check error:', rateError);
    } else if (recentTrades && recentTrades.length >= 3) {
      console.warn('⚠️ Rate limit exceeded for user:', user.id, 'Recent trades:', recentTrades.length);
      return errorResponse('Rate limit: Maximum 3 trades per 5 seconds. Please wait a moment.');
    }

    console.log('📦 Rate limit check passed. Recent trades:', recentTrades?.length || 0);

    // Parse request body
    let requestBody: ExecuteTradeRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return errorResponse('Invalid request body');
    }

    const { symbol, side, leverage, margin } = requestBody;

    console.log('📦 Trade request:', {
      userId: user.id,
      symbol,
      side,
      leverage,
      margin,
      walletAddress: profile.linked_wallet_address,
    });

    // Validate inputs
    if (!symbol || typeof symbol !== 'string') {
      return errorResponse('Invalid symbol');
    }
    if (!side || (side !== 'long' && side !== 'short')) {
      return errorResponse('Invalid side. Must be "long" or "short"');
    }
    if (!leverage || typeof leverage !== 'number' || leverage < 1 || leverage > 50) {
      return errorResponse('Leverage must be between 1 and 50');
    }
    if (!margin || typeof margin !== 'number' || margin < 5) {
      return errorResponse('Minimum margin is 5 USDT');
    }

    // Get user's balances
    const { data: balances, error: balError } = await supabase
      .from('balances')
      .select('demo_usdt_balance, oil_balance')
      .eq('user_id', user.id)
      .single();

    if (balError || !balances) {
      console.error('❌ Balance fetch error:', balError);
      return errorResponse('Failed to fetch balances. Please try again.');
    }

    console.log('📦 User balances:', {
      userId: user.id,
      usdtBalance: balances.demo_usdt_balance,
      oilBalance: balances.oil_balance,
    });

    // Calculate position size and fees
    const positionSizeUsdt = margin * leverage;
    const feeOil = Math.ceil(positionSizeUsdt);

    // Validate balances
    if (balances.demo_usdt_balance < margin) {
      return errorResponse(`Insufficient USDT balance. Have ${balances.demo_usdt_balance.toFixed(2)}, need ${margin.toFixed(2)} USDT.`);
    }
    if (balances.oil_balance < feeOil) {
      return errorResponse(`Insufficient Oil. Have ${balances.oil_balance}, need ${feeOil} Oil for this trade.`);
    }

    // Fetch real-time price from Binance with retry logic
    let markPrice: number;
    try {
      markPrice = await fetchBinancePrice(symbol);
    } catch (priceError) {
      console.error('❌ Binance price fetch error:', priceError);
      return errorResponse('Failed to fetch market price. Please try again.');
    }

    if (markPrice <= 0) {
      return errorResponse('Invalid market price received');
    }

    console.log('📦 Market price fetched:', { symbol, markPrice });

    // Apply slippage based on side
    // LONG: entry_price_executed = base_price * (1 + slippage_rate) - worse price
    // SHORT: entry_price_executed = base_price * (1 - slippage_rate) - worse price
    const entryPriceExecuted = side === 'long'
      ? markPrice * (1 + SLIPPAGE_RATE)
      : markPrice * (1 - SLIPPAGE_RATE);

    // Calculate position size in asset terms
    const positionSize = positionSizeUsdt / entryPriceExecuted;

    // Calculate liquidation price (90% loss = liquidation)
    const maintenanceMargin = margin * 0.5;
    const liquidationDistance = maintenanceMargin / positionSize;
    const liquidationPrice = side === 'long'
      ? entryPriceExecuted - liquidationDistance
      : entryPriceExecuted + liquidationDistance;

    // Insert open position
    const { error: posError } = await supabase
      .from('open_positions')
      .insert({
        user_id: user.id,
        symbol,
        side,
        entry_price: markPrice,
        entry_price_executed: entryPriceExecuted,
        leverage,
        margin,
        position_size: positionSize,
        liquidation_price: Math.max(0, liquidationPrice),
        fee_paid: feeOil,
        slippage_rate: SLIPPAGE_RATE,
      });

    if (posError) {
      console.error('❌ Position insert error:', posError);
      return errorResponse('Failed to open position. Please try again.');
    }

    // Deduct margin and Oil from balances
    const { error: updateError } = await supabase
      .from('balances')
      .update({
        demo_usdt_balance: balances.demo_usdt_balance - margin,
        oil_balance: balances.oil_balance - feeOil,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('❌ Balance update error:', updateError);
      return errorResponse('Position opened but failed to update balances. Please refresh.');
    }

    console.log(`✅ Trade executed: ${side.toUpperCase()} ${symbol}`, {
      userId: user.id,
      entryPriceExecuted,
      markPrice,
      slippage: `${SLIPPAGE_RATE * 100}%`,
      margin,
      leverage,
      feeOil,
      wallet: profile.linked_wallet_address,
    });

    return successResponse({
      symbol,
      side,
      markPrice,
      entryPriceExecuted,
      slippageRate: SLIPPAGE_RATE,
      margin,
      leverage,
      positionSize,
      feeOil,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ Unexpected error in execute-trade:', {
      message: errorMessage,
      stack: errorStack,
    });
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred. Please try again.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
