-- Allow senders to delete their own pending or cancelled requests
CREATE POLICY "Senders can delete their pending requests" 
ON public.private_ride_requests 
FOR DELETE 
USING (auth.uid() = sender_id AND status IN ('pending', 'cancelled'));