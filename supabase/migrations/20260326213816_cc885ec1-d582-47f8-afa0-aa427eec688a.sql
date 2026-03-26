-- Drop the restrictive sender update policy and replace with one that allows cancelling
DROP POLICY IF EXISTS "Senders can cancel pending" ON public.private_ride_requests;

CREATE POLICY "Senders can update their pending requests"
ON public.private_ride_requests
FOR UPDATE
TO public
USING (auth.uid() = sender_id AND status = 'pending'::private_request_status)
WITH CHECK (auth.uid() = sender_id AND status IN ('pending'::private_request_status, 'cancelled'::private_request_status));