-- Add latitude/longitude columns to rides table for map display
ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS pickup_latitude double precision,
ADD COLUMN IF NOT EXISTS pickup_longitude double precision,
ADD COLUMN IF NOT EXISTS dropoff_latitude double precision,
ADD COLUMN IF NOT EXISTS dropoff_longitude double precision;