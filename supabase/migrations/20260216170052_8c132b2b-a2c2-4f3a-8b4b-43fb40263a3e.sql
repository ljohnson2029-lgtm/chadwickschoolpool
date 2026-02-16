
-- Function: Haversine distance in miles between two lat/lng pairs
CREATE OR REPLACE FUNCTION public.haversine_miles(
  lat1 double precision, lon1 double precision,
  lat2 double precision, lon2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 3958.8 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians(lon2 - lon1) / 2) ^ 2
  ))
$$;

-- Function: Notify nearby parents when a ride is created
CREATE OR REPLACE FUNCTION public.notify_nearby_parents_on_ride()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nearby_parent RECORD;
  poster_name TEXT;
  ride_type_label TEXT;
  notif_message TEXT;
BEGIN
  -- Only trigger on broadcast rides with coordinates
  IF NEW.transaction_type != 'broadcast' OR NEW.pickup_latitude IS NULL OR NEW.pickup_longitude IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get poster name
  SELECT COALESCE(first_name || ' ' || last_name, username)
  INTO poster_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  ride_type_label := CASE WHEN NEW.type = 'offer' THEN 'ride offer' ELSE 'ride request' END;

  -- Find parents within 3 miles who have home coordinates and show_on_map enabled
  FOR nearby_parent IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.id != NEW.user_id
      AND p.account_type = 'parent'
      AND p.home_latitude IS NOT NULL
      AND p.home_longitude IS NOT NULL
      AND p.show_on_map = true
      AND public.haversine_miles(
            p.home_latitude, p.home_longitude,
            NEW.pickup_latitude, NEW.pickup_longitude
          ) <= 3.0
  LOOP
    notif_message := '📍 New ' || ride_type_label || ' near you from ' || COALESCE(poster_name, 'a parent') || ' on ' || to_char(NEW.ride_date, 'Mon DD');

    INSERT INTO public.notifications (user_id, type, message)
    VALUES (nearby_parent.id, 'nearby_ride', notif_message);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on ride insert
CREATE TRIGGER trg_notify_nearby_on_ride_create
AFTER INSERT ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.notify_nearby_parents_on_ride();

-- Function: Notify ride owner when ride is expiring (ride_date = today)
CREATE OR REPLACE FUNCTION public.notify_expiring_rides()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expiring_ride RECORD;
BEGIN
  FOR expiring_ride IN
    SELECT r.id, r.user_id, r.type, r.pickup_location, r.dropoff_location
    FROM public.rides r
    WHERE r.status = 'active'
      AND r.ride_date = current_date
      AND r.is_fulfilled = false
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = r.user_id
          AND n.type = 'ride_expiring'
          AND n.message LIKE '%' || r.id::text || '%'
          AND n.created_at::date = current_date
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      expiring_ride.user_id,
      'ride_expiring',
      '⏰ Your ' || CASE WHEN expiring_ride.type = 'offer' THEN 'ride offer' ELSE 'ride request' END ||
      ' from ' || expiring_ride.pickup_location || ' expires today. ' || expiring_ride.id::text
    );
  END LOOP;
END;
$$;

-- Allow authenticated users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);
