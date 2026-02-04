-- Fix schools_table_public_exposure: Require authentication for schools table
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Schools are viewable by everyone" ON public.schools;

-- Create a new policy requiring authentication
CREATE POLICY "Authenticated users can view schools"
  ON public.schools
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Fix approved_emails_no_policies: Add service role access policies
-- The approved_emails table should only be accessible via service role (edge functions)
-- Since RLS is enabled but no policies exist, we add a restrictive policy that denies direct access
-- Edge functions using service role key bypass RLS automatically

CREATE POLICY "No direct access to approved_emails"
  ON public.approved_emails
  FOR ALL
  USING (false);

-- This ensures:
-- 1. Regular users cannot read/write approved_emails directly
-- 2. Service role (edge functions) can still access it as they bypass RLS