
-- Allow users to view profiles of their pending private ride request participants
CREATE POLICY "Users can view profiles of pending private ride participants"
ON public.profiles
FOR SELECT
TO public
USING (
  id IN (
    SELECT pr.sender_id FROM private_ride_requests pr
    WHERE pr.recipient_id = auth.uid() AND pr.status = 'pending'::private_request_status
    UNION
    SELECT pr.recipient_id FROM private_ride_requests pr
    WHERE pr.sender_id = auth.uid() AND pr.status = 'pending'::private_request_status
  )
);

-- Also allow viewing users table data for pending private ride participants
CREATE POLICY "Users can view pending private ride participant data"
ON public.users
FOR SELECT
TO public
USING (
  user_id IN (
    SELECT pr.sender_id FROM private_ride_requests pr
    WHERE pr.recipient_id = auth.uid() AND pr.status = 'pending'::private_request_status
    UNION
    SELECT pr.recipient_id FROM private_ride_requests pr
    WHERE pr.sender_id = auth.uid() AND pr.status = 'pending'::private_request_status
  )
);
