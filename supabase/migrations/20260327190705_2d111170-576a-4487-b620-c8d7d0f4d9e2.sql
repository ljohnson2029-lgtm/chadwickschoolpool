
-- Drop the overly strict unique constraint
ALTER TABLE public.private_ride_requests DROP CONSTRAINT IF EXISTS unique_request;

-- Create a partial unique index that only applies to pending/accepted records
-- and includes request_type so offers and requests don't conflict
CREATE UNIQUE INDEX unique_active_request 
ON public.private_ride_requests (sender_id, recipient_id, ride_date, pickup_time, request_type)
WHERE status IN ('pending', 'accepted');
