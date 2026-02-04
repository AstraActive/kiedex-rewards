-- Fix ALL numeric columns that were added with NUMERIC(20,18) precision
-- These columns need to handle large values like BTC prices ($100,000+)

-- Fix open_positions columns
ALTER TABLE public.open_positions 
ALTER COLUMN entry_price_executed TYPE NUMERIC USING entry_price_executed::NUMERIC;

-- Fix trades_history columns  
ALTER TABLE public.trades_history 
ALTER COLUMN entry_price_executed TYPE NUMERIC USING entry_price_executed::NUMERIC,
ALTER COLUMN exit_price_executed TYPE NUMERIC USING exit_price_executed::NUMERIC,
ALTER COLUMN counted_volume TYPE NUMERIC USING counted_volume::NUMERIC;

-- Fix leaderboard_daily column
ALTER TABLE public.leaderboard_daily 
ALTER COLUMN total_counted_volume TYPE NUMERIC USING total_counted_volume::NUMERIC;