
-- Allow users to view their own rides regardless of status (for past rides)
DROP POLICY IF EXISTS "Authenticated users can view active rides" ON public.rides;

CREATE POLICY "Authenticated users can view active rides" 
ON public.rides 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL AND status = 'active')
  OR (auth.uid() = user_id)
);
