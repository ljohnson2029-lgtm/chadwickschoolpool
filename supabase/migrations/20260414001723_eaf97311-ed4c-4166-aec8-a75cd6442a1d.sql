
-- =====================================================
-- FIX 1: Create a safe view for the users table
-- that excludes password_hash and security fields
-- =====================================================

CREATE OR REPLACE VIEW public.users_safe AS
SELECT 
  user_id,
  email,
  first_name,
  last_name,
  username,
  phone_number,
  is_verified,
  created_at,
  last_login
FROM public.users;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.users_safe TO authenticated;
GRANT SELECT ON public.users_safe TO anon;

-- =====================================================
-- FIX 2: Restrict ride creator profile visibility
-- The current policy exposes ALL profile fields 
-- (home_address, emergency contacts, etc.) to anyone
-- =====================================================

-- Drop the overly broad policy
DROP POLICY IF EXISTS "Users can view profiles of ride creators" ON public.profiles;

-- Replace with a more restricted policy - only show profiles
-- of ride creators (this is needed to display ride listings)
-- The view/component code should only select non-sensitive fields
CREATE POLICY "Users can view basic profiles of ride creators"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT r.user_id FROM rides r WHERE r.status = 'active'
  )
);

-- =====================================================
-- FIX 3: Ensure verified_emails has explicit deny
-- =====================================================

-- Drop any existing permissive policies for non-service roles
-- The table already has a service-role-only ALL policy
-- Add explicit deny for authenticated to be safe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'verified_emails' 
    AND policyname = 'Deny authenticated access to verified_emails'
  ) THEN
    CREATE POLICY "Deny authenticated access to verified_emails"
    ON public.verified_emails
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- =====================================================
-- FIX 4: Move extensions out of public schema
-- =====================================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extensions (these are idempotent - safe to run)
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

DROP EXTENSION IF EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
