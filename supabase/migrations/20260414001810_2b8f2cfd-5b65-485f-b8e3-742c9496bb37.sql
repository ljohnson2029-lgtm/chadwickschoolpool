
-- Drop and recreate the view with security_invoker
DROP VIEW IF EXISTS public.users_safe;

CREATE VIEW public.users_safe 
WITH (security_invoker = true)
AS
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

GRANT SELECT ON public.users_safe TO authenticated;
GRANT SELECT ON public.users_safe TO anon;
