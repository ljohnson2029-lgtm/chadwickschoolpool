
CREATE POLICY "Ride owners can view children of pending requesters"
ON public.children
FOR SELECT
TO public
USING (
  user_id IN (
    SELECT rc.sender_id
    FROM ride_conversations rc
    JOIN rides r ON r.id = rc.ride_id
    WHERE r.user_id = auth.uid()
      AND rc.status = 'pending'
  )
);
