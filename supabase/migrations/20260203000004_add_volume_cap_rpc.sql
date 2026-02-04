-- Create RPC function to safely add counted volume with cap enforcement
-- This prevents race conditions when multiple trades close simultaneously
CREATE OR REPLACE FUNCTION add_counted_volume(
  p_user_id UUID,
  p_date DATE,
  p_volume NUMERIC,
  p_max_cap NUMERIC DEFAULT 50000
)
RETURNS TABLE(counted_volume NUMERIC, capped BOOLEAN, reason TEXT) AS $$
DECLARE
  current_vol NUMERIC;
  new_vol NUMERIC;
  is_capped BOOLEAN := false;
  cap_reason TEXT := NULL;
BEGIN
  -- Lock and get current volume for this user and date
  SELECT COALESCE(total_counted_volume, 0) INTO current_vol
  FROM leaderboard_daily
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;
  
  -- If no entry exists, current volume is 0
  IF current_vol IS NULL THEN
    current_vol := 0;
  END IF;
  
  -- Calculate new volume with cap enforcement
  new_vol := p_volume;
  
  IF current_vol + new_vol > p_max_cap THEN
    new_vol := GREATEST(0, p_max_cap - current_vol);
    is_capped := true;
    
    IF new_vol = 0 THEN
      cap_reason := 'daily_cap_reached';
    ELSE
      cap_reason := 'daily_cap_partial';
    END IF;
  END IF;
  
  -- Update the leaderboard entry if volume is being added
  IF new_vol > 0 THEN
    -- Upsert: Update if exists, insert if not
    INSERT INTO leaderboard_daily (user_id, date, total_counted_volume, total_volume, trade_count)
    VALUES (p_user_id, p_date, new_vol, p_volume, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
      total_counted_volume = leaderboard_daily.total_counted_volume + new_vol,
      total_volume = leaderboard_daily.total_volume + p_volume,
      trade_count = leaderboard_daily.trade_count + 1;
  END IF;
  
  RETURN QUERY SELECT new_vol, is_capped, cap_reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_counted_volume TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION add_counted_volume IS 
'Atomically adds counted volume to leaderboard with daily cap enforcement. Prevents race conditions.';
