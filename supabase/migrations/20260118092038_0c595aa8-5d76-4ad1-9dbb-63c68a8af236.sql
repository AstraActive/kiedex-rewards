-- Update the handle_new_user function to validate Gmail domains
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_referral_code TEXT;
    email_domain TEXT;
BEGIN
    -- Extract email domain
    email_domain := lower(split_part(NEW.email, '@', 2));
    
    -- Validate Gmail domain only
    IF email_domain NOT IN ('gmail.com', 'googlemail.com') THEN
        RAISE EXCEPTION 'Only Gmail accounts (@gmail.com, @googlemail.com) are allowed';
    END IF;
    
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