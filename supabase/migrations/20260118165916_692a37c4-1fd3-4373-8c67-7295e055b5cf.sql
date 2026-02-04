-- Create a secure function to lookup referrer by referral code
-- This bypasses RLS to allow new users to find their referrer
CREATE OR REPLACE FUNCTION public.lookup_referrer_by_code(code TEXT)
RETURNS TABLE(user_id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id
  FROM profiles p
  WHERE p.referral_code = code
  LIMIT 1;
END;
$$;