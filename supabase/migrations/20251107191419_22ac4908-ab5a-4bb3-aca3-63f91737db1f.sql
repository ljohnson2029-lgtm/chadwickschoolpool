-- Remove public access to approved_emails table
DROP POLICY IF EXISTS "Anyone can view approved emails" ON public.approved_emails;