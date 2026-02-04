-- Fix fee_paid column which has NUMERIC(20,18) - too restrictive for fee values
-- Fee can be position_size_usdt which could be thousands of USDT

ALTER TABLE public.open_positions 
ALTER COLUMN fee_paid TYPE NUMERIC USING fee_paid::NUMERIC;

ALTER TABLE public.trades_history 
ALTER COLUMN fee_paid TYPE NUMERIC USING fee_paid::NUMERIC;