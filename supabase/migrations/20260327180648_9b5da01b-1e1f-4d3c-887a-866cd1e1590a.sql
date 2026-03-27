-- Allow ride owners to delete conversations on their rides (for cancellation cleanup)
CREATE POLICY "Ride owners can delete conversations on their rides"
ON public.ride_conversations
FOR DELETE
TO public
USING (
  ride_id IN (
    SELECT id FROM public.rides WHERE user_id = auth.uid()
  )
);