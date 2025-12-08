-- Fix 1: Require authentication for viewing active rides
DROP POLICY IF EXISTS "Everyone can view active rides" ON public.rides;

CREATE POLICY "Authenticated users can view active rides"
ON public.rides
FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'active');

-- Fix 2: Remove public read access from parent_email_whitelist
DROP POLICY IF EXISTS "Anyone can read whitelist" ON public.parent_email_whitelist;