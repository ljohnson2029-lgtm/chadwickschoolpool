-- Fix profiles table - remove public read access and allow users to only see their own profile
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Fix verified_emails table - remove all public access policies
DROP POLICY IF EXISTS "Anyone can view verified emails" ON public.verified_emails;
DROP POLICY IF EXISTS "Anyone can insert verified emails" ON public.verified_emails;

-- Add service-role only policies for verified_emails (these won't apply to regular users)
CREATE POLICY "Service role can manage verified emails"
ON public.verified_emails
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);