-- Fix numeric precision for slippage_rate columns (NUMERIC(20,18) is too restrictive)
-- Changing to NUMERIC(10,8) which allows values up to 99.99999999 - more than enough for slippage rates

-- Fix open_positions.slippage_rate
ALTER TABLE public.open_positions 
ALTER COLUMN slippage_rate TYPE NUMERIC(10,8);

-- Fix trades_history.slippage_rate
ALTER TABLE public.trades_history 
ALTER COLUMN slippage_rate TYPE NUMERIC(10,8);