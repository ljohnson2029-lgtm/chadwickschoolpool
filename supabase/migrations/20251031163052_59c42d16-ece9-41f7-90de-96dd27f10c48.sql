-- Fix critical security issue: Remove public access to users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING ((auth.uid())::text = (user_id)::text);

-- Fix critical security issue: Restrict verification codes to owner's email only
DROP POLICY IF EXISTS "Users can view their own codes" ON public.verification_codes;

CREATE POLICY "Users can view their own codes"
ON public.verification_codes
FOR SELECT
USING ((auth.jwt() ->> 'email') = email);