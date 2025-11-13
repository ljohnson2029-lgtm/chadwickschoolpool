-- Harmless comments to trigger type regeneration for TS types
COMMENT ON TABLE public.rides IS 'Carpool rides (offers and requests).';
COMMENT ON COLUMN public.rides.user_id IS 'Owner user id';
COMMENT ON COLUMN public.rides.ride_date IS 'Ride date';
COMMENT ON COLUMN public.rides.ride_time IS 'Ride time';
COMMENT ON COLUMN public.rides.seats_needed IS 'Passengers requested';
COMMENT ON COLUMN public.rides.seats_available IS 'Seats available for offer';
COMMENT ON COLUMN public.rides.is_recurring IS 'Recurring flag';
COMMENT ON COLUMN public.rides.recurring_days IS 'Recurring days';
COMMENT ON COLUMN public.rides.status IS 'Ride status';
COMMENT ON COLUMN public.rides.type IS 'Type: offer | request';
COMMENT ON COLUMN public.rides.pickup_location IS 'Pickup';
COMMENT ON COLUMN public.rides.dropoff_location IS 'Dropoff';
COMMENT ON COLUMN public.rides.route_details IS 'Route details';

COMMENT ON TABLE public.children IS 'User children records';
COMMENT ON COLUMN public.children.user_id IS 'Owner user id';
COMMENT ON COLUMN public.children.name IS 'Child name';
COMMENT ON COLUMN public.children.age IS 'Child age';
COMMENT ON COLUMN public.children.school IS 'School';

COMMENT ON TABLE public.profiles IS 'User profile with car details';
COMMENT ON COLUMN public.profiles.home_address IS 'Home address';
COMMENT ON COLUMN public.profiles.car_make IS 'Car make';
COMMENT ON COLUMN public.profiles.car_model IS 'Car model';
COMMENT ON COLUMN public.profiles.car_seats IS 'Car seats';