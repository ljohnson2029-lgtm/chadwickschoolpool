
-- Rate limit: max 10 rides per user per day
CREATE OR REPLACE FUNCTION public.enforce_ride_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ride_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO ride_count
  FROM public.rides
  WHERE user_id = NEW.user_id
    AND created_at >= (now() - interval '24 hours');

  IF ride_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 10 rides per 24 hours';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_ride_rate_limit_trigger
BEFORE INSERT ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ride_rate_limit();
