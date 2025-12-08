-- Fix search_path for is_valid_parent_email function
CREATE OR REPLACE FUNCTION public.is_valid_parent_email(email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NOT (email LIKE '%@chadwickschool.org');
$$;

-- Fix search_path for is_valid_student_email function
CREATE OR REPLACE FUNCTION public.is_valid_student_email(email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT email LIKE '%@chadwickschool.org';
$$;