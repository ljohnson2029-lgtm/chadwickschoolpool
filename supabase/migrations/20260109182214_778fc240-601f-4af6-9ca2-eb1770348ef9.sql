-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- The service role policy already exists for server-side inserts
-- Edge functions and backend services will use service role to create notifications
-- The existing "Service role can insert notifications" policy handles this