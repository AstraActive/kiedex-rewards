-- Add slippage and executed price columns to open_positions
ALTER TABLE open_positions 
ADD COLUMN IF NOT EXISTS slippage_rate numeric NOT NULL DEFAULT 0.0003,
ADD COLUMN IF NOT EXISTS entry_price_executed numeric;

-- Add slippage, anti-spam, and volume tracking columns to trades_history
ALTER TABLE trades_history 
ADD COLUMN IF NOT EXISTS slippage_rate numeric NOT NULL DEFAULT 0.0003,
ADD COLUMN IF NOT EXISTS entry_price_executed numeric,
ADD COLUMN IF NOT EXISTS exit_price_executed numeric,
ADD COLUMN IF NOT EXISTS open_time_seconds integer,
ADD COLUMN IF NOT EXISTS counted_volume numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS counted_volume_reason text;

-- Add counted volume column to leaderboard_daily
ALTER TABLE leaderboard_daily 
ADD COLUMN IF NOT EXISTS total_counted_volume numeric NOT NULL DEFAULT 0;

-- Update the leaderboard trigger to use counted_volume
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_trade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trade_date DATE;
  is_win BOOLEAN;
  entry_price_used NUMERIC;
BEGIN
  -- Get the UTC date of the trade
  trade_date := (NEW.closed_at AT TIME ZONE 'UTC')::DATE;
  
  -- Determine if this is a winning trade
  is_win := COALESCE(NEW.realized_pnl, 0) > 0;
  
  -- Use executed entry price if available, otherwise use entry_price
  entry_price_used := COALESCE(NEW.entry_price_executed, NEW.entry_price);
  
  -- Upsert into leaderboard_daily
  INSERT INTO leaderboard_daily (
    user_id,
    date,
    total_volume,
    total_counted_volume,
    total_pnl,
    trade_count,
    win_count,
    updated_at
  )
  VALUES (
    NEW.user_id,
    trade_date,
    NEW.position_size * entry_price_used,
    COALESCE(NEW.counted_volume, 0),
    COALESCE(NEW.realized_pnl, 0),
    1,
    CASE WHEN is_win THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    total_volume = leaderboard_daily.total_volume + (NEW.position_size * entry_price_used),
    total_counted_volume = leaderboard_daily.total_counted_volume + COALESCE(NEW.counted_volume, 0),
    total_pnl = leaderboard_daily.total_pnl + COALESCE(NEW.realized_pnl, 0),
    trade_count = leaderboard_daily.trade_count + 1,
    win_count = leaderboard_daily.win_count + CASE WHEN is_win THEN 1 ELSE 0 END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$function$;