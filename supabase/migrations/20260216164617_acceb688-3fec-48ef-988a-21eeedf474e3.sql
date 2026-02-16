
-- Create the cleanup function that marks rides as 'completed' when 2+ hours past
CREATE OR REPLACE FUNCTION public.cleanup_past_rides()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.rides 
  SET status = 'completed'
  WHERE status = 'active' 
    AND (ride_date + ride_time) < (now() - interval '2 hours');
END;
$$;
