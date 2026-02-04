-- Add unique constraint on (user_id, date) for upsert to work
ALTER TABLE leaderboard_daily 
ADD CONSTRAINT leaderboard_daily_user_date_unique 
UNIQUE (user_id, date);

-- Create function to update leaderboard when a trade is closed
CREATE OR REPLACE FUNCTION public.update_leaderboard_on_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_date DATE;
  is_win BOOLEAN;
BEGIN
  -- Get the UTC date of the trade
  trade_date := (NEW.closed_at AT TIME ZONE 'UTC')::DATE;
  
  -- Determine if this is a winning trade
  is_win := COALESCE(NEW.realized_pnl, 0) > 0;
  
  -- Upsert into leaderboard_daily
  INSERT INTO leaderboard_daily (
    user_id,
    date,
    total_volume,
    total_pnl,
    trade_count,
    win_count,
    updated_at
  )
  VALUES (
    NEW.user_id,
    trade_date,
    NEW.position_size * NEW.entry_price,
    COALESCE(NEW.realized_pnl, 0),
    1,
    CASE WHEN is_win THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    total_volume = leaderboard_daily.total_volume + (NEW.position_size * NEW.entry_price),
    total_pnl = leaderboard_daily.total_pnl + COALESCE(NEW.realized_pnl, 0),
    trade_count = leaderboard_daily.trade_count + 1,
    win_count = leaderboard_daily.win_count + CASE WHEN is_win THEN 1 ELSE 0 END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Create trigger on trades_history
CREATE TRIGGER trigger_update_leaderboard
AFTER INSERT ON trades_history
FOR EACH ROW
EXECUTE FUNCTION public.update_leaderboard_on_trade();

-- Backfill existing trades into leaderboard_daily
INSERT INTO leaderboard_daily (user_id, date, total_volume, total_pnl, trade_count, win_count, updated_at)
SELECT 
  user_id,
  (closed_at AT TIME ZONE 'UTC')::DATE as date,
  SUM(position_size * entry_price) as total_volume,
  SUM(COALESCE(realized_pnl, 0)) as total_pnl,
  COUNT(*) as trade_count,
  COUNT(*) FILTER (WHERE COALESCE(realized_pnl, 0) > 0) as win_count,
  NOW() as updated_at
FROM trades_history
GROUP BY user_id, (closed_at AT TIME ZONE 'UTC')::DATE
ON CONFLICT (user_id, date) 
DO UPDATE SET
  total_volume = EXCLUDED.total_volume,
  total_pnl = EXCLUDED.total_pnl,
  trade_count = EXCLUDED.trade_count,
  win_count = EXCLUDED.win_count,
  updated_at = NOW();