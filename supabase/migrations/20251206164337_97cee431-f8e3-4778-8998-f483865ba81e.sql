-- Create parent email whitelist table
CREATE TABLE public.parent_email_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parent_email_whitelist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the whitelist (needed for signup checks)
CREATE POLICY "Anyone can read whitelist" 
ON public.parent_email_whitelist 
FOR SELECT 
USING (true);

-- Only service role can modify
CREATE POLICY "Service role can manage whitelist" 
ON public.parent_email_whitelist 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role');

-- Create function to check if email is in parent whitelist
CREATE OR REPLACE FUNCTION public.is_whitelisted_parent(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_email_whitelist 
    WHERE LOWER(email) = LOWER(check_email)
  );
$$;

-- Update the is_student_email function to respect whitelist
CREATE OR REPLACE FUNCTION public.is_student_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- If email is in whitelist, they're a parent (not student)
  -- Otherwise, check if ends with @chadwickschool.org
  SELECT 
    CASE 
      WHEN public.is_whitelisted_parent(user_email) THEN false
      ELSE user_email LIKE '%@chadwickschool.org'
    END;
$$;