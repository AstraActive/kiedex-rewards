-- Drop existing policies on bonus_claims
DROP POLICY IF EXISTS "Users can insert their own bonus claims" ON public.bonus_claims;
DROP POLICY IF EXISTS "Users can view their own bonus claims" ON public.bonus_claims;

-- Create new policies for authenticated users only
CREATE POLICY "Users can insert their own bonus claims" 
ON public.bonus_claims 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bonus claims" 
ON public.bonus_claims 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Also fix balances table policies
DROP POLICY IF EXISTS "Users can insert their own balances" ON public.balances;
DROP POLICY IF EXISTS "Users can update their own balances" ON public.balances;
DROP POLICY IF EXISTS "Users can view their own balances" ON public.balances;

CREATE POLICY "Users can view their own balances" 
ON public.balances 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balances" 
ON public.balances 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balances" 
ON public.balances 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);