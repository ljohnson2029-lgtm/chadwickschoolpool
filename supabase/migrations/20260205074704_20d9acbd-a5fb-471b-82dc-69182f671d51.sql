-- Recreate get_family_schedule with consistent types (cast time columns to text)
CREATE OR REPLACE FUNCTION public.get_family_schedule(student_user_id uuid)
RETURNS TABLE (
  id uuid,
  type text,
  ride_date date,
  ride_time text,
  pickup_location text,
  dropoff_location text,
  pickup_latitude double precision,
  pickup_longitude double precision,
  dropoff_latitude double precision,
  dropoff_longitude double precision,
  seats_available integer,
  seats_needed integer,
  status text,
  user_id uuid,
  parent_id uuid,
  parent_first_name text,
  parent_last_name text,
  parent_email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Rides posted by linked parents
  SELECT
    r.id,
    r.type,
    r.ride_date,
    r.ride_time::text,
    r.pickup_location,
    r.dropoff_location,
    r.pickup_latitude,
    r.pickup_longitude,
    r.dropoff_latitude,
    r.dropoff_longitude,
    r.seats_available,
    r.seats_needed,
    r.status,
    r.user_id,
    al.parent_id,
    pp.first_name AS parent_first_name,
    pp.last_name  AS parent_last_name,
    public.get_user_email(al.parent_id) AS parent_email
  FROM public.account_links al
  JOIN public.profiles pp ON pp.id = al.parent_id
  JOIN public.rides r ON r.user_id = al.parent_id
  WHERE auth.uid() = student_user_id
    AND al.student_id = student_user_id
    AND al.status = 'approved'
    AND r.status = 'active'
    AND r.ride_date >= current_date

  UNION

  -- Rides linked parents have joined (accepted conversation as sender)
  SELECT
    r.id,
    r.type,
    r.ride_date,
    r.ride_time::text,
    r.pickup_location,
    r.dropoff_location,
    r.pickup_latitude,
    r.pickup_longitude,
    r.dropoff_latitude,
    r.dropoff_longitude,
    r.seats_available,
    r.seats_needed,
    r.status,
    r.user_id,
    al.parent_id,
    pp.first_name AS parent_first_name,
    pp.last_name  AS parent_last_name,
    public.get_user_email(al.parent_id) AS parent_email
  FROM public.account_links al
  JOIN public.profiles pp ON pp.id = al.parent_id
  JOIN public.ride_conversations rc
    ON rc.sender_id = al.parent_id
   AND rc.status = 'accepted'
  JOIN public.rides r ON r.id = rc.ride_id
  WHERE auth.uid() = student_user_id
    AND al.student_id = student_user_id
    AND al.status = 'approved'
    AND r.status = 'active'
    AND r.ride_date >= current_date
    AND r.user_id <> al.parent_id

  UNION

  -- Accepted private rides involving linked parents
  SELECT
    pr.id,
    pr.request_type::text AS type,
    pr.ride_date,
    pr.pickup_time::text AS ride_time,
    pr.pickup_address AS pickup_location,
    pr.dropoff_address AS dropoff_location,
    pr.pickup_latitude::double precision,
    pr.pickup_longitude::double precision,
    pr.dropoff_latitude::double precision,
    pr.dropoff_longitude::double precision,
    pr.seats_offered AS seats_available,
    pr.seats_needed,
    pr.status::text AS status,
    al.parent_id AS user_id,
    al.parent_id,
    pp.first_name AS parent_first_name,
    pp.last_name  AS parent_last_name,
    public.get_user_email(al.parent_id) AS parent_email
  FROM public.account_links al
  JOIN public.profiles pp ON pp.id = al.parent_id
  JOIN public.private_ride_requests pr
    ON pr.status = 'accepted'
   AND (pr.sender_id = al.parent_id OR pr.recipient_id = al.parent_id)
  WHERE auth.uid() = student_user_id
    AND al.student_id = student_user_id
    AND al.status = 'approved'
    AND pr.ride_date >= current_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_family_schedule(uuid) TO authenticated;