-- Add privacy settings columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_on_map boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS share_email boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS share_phone boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accept_requests_from_anyone boolean DEFAULT true;