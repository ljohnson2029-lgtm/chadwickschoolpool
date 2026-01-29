-- Allow authenticated users to view basic profile info of users who have active rides
-- This is needed so parents can see who posted rides on the map/list view
CREATE POLICY "Users can view profiles of ride creators"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT user_id FROM public.rides WHERE status = 'active'
  )
);

-- Also allow viewing profiles of users who have sent/received private ride requests with the current user
CREATE POLICY "Users can view profiles of ride request participants"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT sender_id FROM public.private_ride_requests 
    WHERE recipient_id = auth.uid()
  )
  OR
  id IN (
    SELECT recipient_id FROM public.private_ride_requests 
    WHERE sender_id = auth.uid()
  )
);

-- Allow viewing profiles for ride conversation participants
CREATE POLICY "Users can view profiles of conversation participants"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT sender_id FROM public.ride_conversations 
    WHERE recipient_id = auth.uid()
  )
  OR
  id IN (
    SELECT recipient_id FROM public.ride_conversations 
    WHERE sender_id = auth.uid()
  )
);