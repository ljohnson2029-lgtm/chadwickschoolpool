-- Add latitude and longitude columns to profiles table for storing home address coordinates
ALTER TABLE public.profiles 
ADD COLUMN home_latitude DOUBLE PRECISION,
ADD COLUMN home_longitude DOUBLE PRECISION;