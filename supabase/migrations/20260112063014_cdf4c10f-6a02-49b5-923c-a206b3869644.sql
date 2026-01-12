-- Add policy to explicitly deny anonymous access to users table
-- This ensures only authenticated users can access user data

CREATE POLICY "Deny anonymous access to users"
ON public.users
FOR SELECT
USING (auth.uid() IS NOT NULL);