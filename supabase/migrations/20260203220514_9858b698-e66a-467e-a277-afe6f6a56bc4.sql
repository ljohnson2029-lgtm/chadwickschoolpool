-- Fix 1: Move extensions from public schema to extensions schema
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm extension to extensions schema (commonly installed in public)
-- First drop from public, then recreate in extensions
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Move uuid-ossp to extensions schema if it exists in public
DROP EXTENSION IF EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Fix 2: Add explicit RLS policies for verification_codes table
-- Prevent unauthorized INSERT, UPDATE, DELETE operations

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Only service role can insert codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Only service role can update codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Only service role can delete codes" ON public.verification_codes;

-- Service role can INSERT verification codes (edge functions use this)
CREATE POLICY "Only service role can insert codes"
ON public.verification_codes
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Service role can UPDATE verification codes (for marking as used)
CREATE POLICY "Only service role can update codes"
ON public.verification_codes
FOR UPDATE
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Service role can DELETE verification codes (for cleanup)
CREATE POLICY "Only service role can delete codes"
ON public.verification_codes
FOR DELETE
USING ((auth.jwt() ->> 'role') = 'service_role');

-- Fix 3: Create automated cleanup function for old ride data (privacy/data retention)
-- This deletes rides and private_ride_requests older than 90 days

CREATE OR REPLACE FUNCTION public.cleanup_old_ride_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete private ride requests older than 90 days
  DELETE FROM public.private_ride_requests
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Delete rides older than 90 days (only inactive/completed ones)
  DELETE FROM public.rides
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND status IN ('completed', 'cancelled', 'expired');
  
  -- Log cleanup for monitoring
  RAISE NOTICE 'Old ride data cleanup completed at %', NOW();
END;
$$;