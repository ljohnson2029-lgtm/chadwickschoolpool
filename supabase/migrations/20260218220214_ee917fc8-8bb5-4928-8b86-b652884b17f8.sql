
-- Adjust access_requests: add unique constraint on email, add approved_by, rename requester_type to user_type
ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.access_requests RENAME COLUMN requester_type TO user_type;
ALTER TABLE public.access_requests ADD CONSTRAINT access_requests_email_unique UNIQUE (email);

-- Adjust approved_emails: add approved_by column
ALTER TABLE public.approved_emails ADD COLUMN IF NOT EXISTS approved_by TEXT;

-- Pre-populate admin emails (ignore if already exist)
INSERT INTO public.approved_emails (email, approved_by) VALUES 
  ('luke.r.johnson.2010@gmail.com', 'system'),
  ('efang508@gmail.com', 'system')
ON CONFLICT (email) DO NOTHING;
