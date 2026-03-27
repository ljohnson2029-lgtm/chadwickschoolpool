ALTER TABLE public.recurring_rides
  ADD COLUMN seats_available integer,
  ADD COLUMN seats_needed integer,
  ADD COLUMN vehicle_info jsonb;