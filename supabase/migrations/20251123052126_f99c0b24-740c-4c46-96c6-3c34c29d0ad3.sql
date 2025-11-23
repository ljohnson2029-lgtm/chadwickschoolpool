-- Remove ljohnson2029@chadwickschool.org exception - make it a student account
CREATE OR REPLACE FUNCTION public.is_student_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT user_email LIKE '%@chadwickschool.org';
$$;

CREATE OR REPLACE FUNCTION public.is_valid_student_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT email LIKE '%@chadwickschool.org';
$$;

CREATE OR REPLACE FUNCTION public.is_valid_parent_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NOT (email LIKE '%@chadwickschool.org');
$$;

-- Add luke.r.johnson.2010@gmail.com as an approved email for parent account creation
INSERT INTO public.approved_emails (email)
VALUES ('luke.r.johnson.2010@gmail.com')
ON CONFLICT (email) DO NOTHING;