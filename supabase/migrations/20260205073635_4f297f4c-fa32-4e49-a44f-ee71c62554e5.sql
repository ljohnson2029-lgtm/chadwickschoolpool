-- Create RPC to fetch a student's full family schedule (linked parents' posted rides + rides they joined)

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
  -- Safety: only allow the logged-in student to request their own schedule
  SELECT
    r.id,
    r.type,
    r.ride_date,
    r.ride_time,
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

  -- Rides the linked parent has joined (accepted conversation as sender)
  SELECT
    r.id,
    r.type,
    r.ride_date,
    r.ride_time,
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
    -- Avoid duplication with the parent's own posted rides
    AND r.user_id <> al.parent_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_family_schedule(uuid) TO authenticated;