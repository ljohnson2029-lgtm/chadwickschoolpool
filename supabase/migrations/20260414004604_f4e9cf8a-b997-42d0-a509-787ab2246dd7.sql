
-- =============================================
-- FIX 1: Lock down users table SELECT policies
-- Remove all policies that let other users read full rows (including password_hash)
-- =============================================

-- Drop all the broad SELECT policies on users table
DROP POLICY IF EXISTS "Ride conversation participants can view user dat" ON public.users;
DROP POLICY IF EXISTS "Ride conversation participants can view user data" ON public.users;
DROP POLICY IF EXISTS "Private ride participants can view user data" ON public.users;
DROP POLICY IF EXISTS "Users can view ride creators data" ON public.users;
DROP POLICY IF EXISTS "Parents can view linked students user data" ON public.users;
DROP POLICY IF EXISTS "Series partners can view user data" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

-- Only allow users to view their own row
CREATE POLICY "Users can view own data only"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role retains full access (for edge functions)
-- This is already handled by service role bypassing RLS

-- =============================================
-- FIX 2: Hide verification_code from students
-- Replace the student SELECT policy with one that works through a secure view
-- =============================================

-- Drop existing student policy
DROP POLICY IF EXISTS "Students can view their own links" ON public.student_parent_links;

-- Create a view that excludes sensitive columns for student access
CREATE OR REPLACE VIEW public.student_parent_links_safe
WITH (security_invoker = true)
AS
SELECT id, student_id, parent_id, status, created_at, approved_at
FROM public.student_parent_links;

-- Re-create student policy (they can still query the table but we'll direct frontend to use the view)
CREATE POLICY "Students can view their own links"
ON public.student_parent_links
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Grant select on the safe view
GRANT SELECT ON public.student_parent_links_safe TO authenticated;
GRANT SELECT ON public.student_parent_links_safe TO anon;
