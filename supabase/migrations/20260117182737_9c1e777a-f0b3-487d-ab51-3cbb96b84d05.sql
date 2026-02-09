-- Create bonus_claims table to track all bonuses (or alter if exists)
DO $$
BEGIN
    -- Try to create the table
    CREATE TABLE IF NOT EXISTS public.bonus_claims (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL,
      bonus_type TEXT NOT NULL,
      amount_oil INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );
    
    -- Add claim_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bonus_claims' 
        AND column_name = 'claim_date'
    ) THEN
        ALTER TABLE public.bonus_claims 
        ADD COLUMN claim_date DATE NOT NULL DEFAULT NOW()::DATE;
        
        -- Update existing records to have claim_date
        UPDATE public.bonus_claims 
        SET claim_date = created_at::DATE 
        WHERE claim_date IS NULL;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.bonus_claims.claim_date IS 
'Date when bonus was claimed. Used with unique constraint to allow daily bonuses once per day.';

-- Drop the old unique constraint that prevented daily claims
DROP INDEX IF EXISTS bonus_claims_user_type_unique;

-- Add unique constraints to prevent duplicate bonuses
-- For one-time bonuses (WELCOME_OIL): user can only claim once ever
CREATE UNIQUE INDEX IF NOT EXISTS bonus_claims_welcome_unique 
ON public.bonus_claims (user_id, bonus_type) 
WHERE bonus_type = 'WELCOME_OIL';

-- For daily bonuses (DAILY_OIL): user can claim once per day
CREATE UNIQUE INDEX IF NOT EXISTS bonus_claims_daily_unique 
ON public.bonus_claims (user_id, claim_date) 
WHERE bonus_type = 'DAILY_OIL';

-- Enable RLS
ALTER TABLE public.bonus_claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own bonus claims" ON public.bonus_claims;

-- Users can view their own bonus claims
CREATE POLICY "Users can view their own bonus claims"
ON public.bonus_claims
FOR SELECT
USING (auth.uid() = user_id);

-- Update the handle_new_user function to grant welcome bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_referral_code TEXT;
BEGIN
    -- Generate unique referral code
    LOOP
        new_referral_code := generate_referral_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code);
    END LOOP;
    
    -- Create profile
    INSERT INTO public.profiles (user_id, email, referral_code)
    VALUES (NEW.id, NEW.email, new_referral_code);
    
    -- Create default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    -- Create initial balances with welcome bonus (50 Oil)
    INSERT INTO public.balances (user_id, oil_balance)
    VALUES (NEW.id, 50);
    
    -- Record the welcome bonus claim
    INSERT INTO public.bonus_claims (user_id, bonus_type, amount_oil, claim_date)
    VALUES (NEW.id, 'WELCOME_OIL', 50, NOW()::DATE);
    
    RETURN NEW;
END;
$function$;