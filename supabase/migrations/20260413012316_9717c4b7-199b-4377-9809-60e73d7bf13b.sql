-- Fix 1: Prevent parents from self-approving account link requests
-- Drop the existing overly permissive parent UPDATE policy
DROP POLICY IF EXISTS "Parents can update link status" ON public.account_links;

-- Recreate with restriction: parents can only update to 'cancelled' (not 'approved')
CREATE POLICY "Parents can update link status"
ON public.account_links
FOR UPDATE
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id AND status IN ('cancelled', 'pending'));

-- Fix 2: Tighten access_requests INSERT policy (replace WITH CHECK true)
DROP POLICY IF EXISTS "Anyone can submit access requests" ON public.access_requests;

CREATE POLICY "Anyone can submit access requests"
ON public.access_requests
FOR INSERT
TO public
WITH CHECK (
  status = 'pending'
  AND length(email) > 0
  AND length(full_name) > 0
  AND length(user_type) > 0
);