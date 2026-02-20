-- Add atomic oil balance increment function
-- Prevents race conditions when two concurrent deposit verifications
-- both try to update the same user's oil_balance.

CREATE OR REPLACE FUNCTION public.increment_oil_balance(
  p_user_id UUID,
  p_amount   NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Single-statement atomic increment — no SELECT needed
  UPDATE public.balances
     SET oil_balance = oil_balance + p_amount,
         updated_at  = now()
   WHERE user_id = p_user_id;

  -- If the user has no balance row yet (edge case), create one
  IF NOT FOUND THEN
    INSERT INTO public.balances (user_id, oil_balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE
      SET oil_balance = public.balances.oil_balance + p_amount,
          updated_at  = now();
  END IF;
END;
$$;

-- Grant execute to the service role used by edge functions
GRANT EXECUTE ON FUNCTION public.increment_oil_balance(UUID, NUMERIC) TO service_role;
