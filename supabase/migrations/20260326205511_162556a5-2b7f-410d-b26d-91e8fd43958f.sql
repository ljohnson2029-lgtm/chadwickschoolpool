
CREATE OR REPLACE FUNCTION public.reset_ride_fulfillment(p_ride_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow reset if the calling user is a participant in a conversation for this ride
  IF NOT EXISTS (
    SELECT 1 FROM public.ride_conversations
    WHERE ride_id = p_ride_id
      AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to reset this ride';
  END IF;

  UPDATE public.rides
  SET is_fulfilled = false
  WHERE id = p_ride_id;
END;
$$;
