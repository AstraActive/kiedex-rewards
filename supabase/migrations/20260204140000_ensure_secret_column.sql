-- Add secret column if it doesn't exist (safe migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_mfa' 
        AND column_name = 'secret'
    ) THEN
        ALTER TABLE public.user_mfa 
        ADD COLUMN secret TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
