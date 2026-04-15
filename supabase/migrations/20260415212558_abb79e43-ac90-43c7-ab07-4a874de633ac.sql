
CREATE TABLE public.banned_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  reason text,
  banned_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage banned emails"
ON public.banned_emails
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
