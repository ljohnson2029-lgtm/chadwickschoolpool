-- Allow viewing children of users you share accepted ride conversations with
CREATE POLICY "Users can view children of ride conversation participants"
ON public.children
FOR SELECT
TO public
USING (
  user_id IN (
    SELECT rc.sender_id FROM ride_conversations rc
    WHERE rc.recipient_id = auth.uid() AND rc.status = 'accepted'
    UNION
    SELECT rc.recipient_id FROM ride_conversations rc
    WHERE rc.sender_id = auth.uid() AND rc.status = 'accepted'
    UNION
    SELECT r.user_id FROM rides r
    JOIN ride_conversations rc ON rc.ride_id = r.id
    WHERE (rc.sender_id = auth.uid() OR rc.recipient_id = auth.uid()) AND rc.status = 'accepted'
  )
);

-- Allow viewing children of users you share accepted private ride requests with
CREATE POLICY "Users can view children of private ride participants"
ON public.children
FOR SELECT
TO public
USING (
  user_id IN (
    SELECT pr.sender_id FROM private_ride_requests pr
    WHERE pr.recipient_id = auth.uid() AND pr.status IN ('accepted', 'completed')
    UNION
    SELECT pr.recipient_id FROM private_ride_requests pr
    WHERE pr.sender_id = auth.uid() AND pr.status IN ('accepted', 'completed')
  )
);