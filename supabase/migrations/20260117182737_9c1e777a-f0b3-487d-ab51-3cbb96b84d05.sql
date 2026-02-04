-- Create bonus_claims table to track all bonuses
CREATE TABLE public.bonus_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bonus_type TEXT NOT NULL,
  amount_oil INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint to prevent duplicate bonuses
CREATE UNIQUE INDEX bonus_claims_user_type_unique ON public.bonus_claims (user_id, bonus_type);

-- Enable RLS
ALTER TABLE public.bonus_claims ENABLE ROW LEVEL SECURITY;

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
    INSERT INTO public.bonus_claims (user_id, bonus_type, amount_oil)
    VALUES (NEW.id, 'WELCOME_OIL', 50);
    
    RETURN NEW;
END;
$function$;