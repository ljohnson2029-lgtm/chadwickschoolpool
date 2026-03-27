
ALTER TABLE public.private_ride_requests 
ADD COLUMN IF NOT EXISTS selected_children jsonb,
ADD COLUMN IF NOT EXISTS recipient_selected_children jsonb;

CREATE POLICY "Senders can cancel accepted requests"
ON public.private_ride_requests
FOR UPDATE
TO public
USING (auth.uid() = sender_id AND status = 'accepted')
WITH CHECK (auth.uid() = sender_id AND status = 'cancelled');
