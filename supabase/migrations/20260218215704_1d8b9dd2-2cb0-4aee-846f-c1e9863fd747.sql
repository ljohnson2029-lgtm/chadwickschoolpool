
-- Create access_requests table
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  requester_type TEXT NOT NULL, -- 'parent' or 'student'
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, denied
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (unauthenticated users submitting requests)
CREATE POLICY "Anyone can submit access requests"
  ON public.access_requests
  FOR INSERT
  WITH CHECK (true);

-- Only service role can read/update/delete
CREATE POLICY "Service role can manage access requests"
  ON public.access_requests
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Trigger for updated_at
CREATE TRIGGER update_access_requests_updated_at
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
