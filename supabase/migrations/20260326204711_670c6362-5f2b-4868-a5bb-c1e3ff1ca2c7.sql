
-- Drop the trigger (correct name)
DROP TRIGGER IF EXISTS trg_notify_nearby_on_ride_create ON public.rides;

-- Drop the function
DROP FUNCTION IF EXISTS public.notify_nearby_parents_on_ride();

-- Delete existing nearby_ride notifications
DELETE FROM public.notifications WHERE type = 'nearby_ride';
