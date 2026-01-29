-- Add missing profile fields for parents and students
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS car_color text,
ADD COLUMN IF NOT EXISTS license_plate text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS parent_guardian_name text,
ADD COLUMN IF NOT EXISTS parent_guardian_phone text,
ADD COLUMN IF NOT EXISTS parent_guardian_email text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.emergency_contact_name IS 'Emergency contact for student accounts';
COMMENT ON COLUMN public.profiles.emergency_contact_phone IS 'Emergency contact phone for student accounts';
COMMENT ON COLUMN public.profiles.parent_guardian_name IS 'Parent/guardian name for student accounts';
COMMENT ON COLUMN public.profiles.parent_guardian_phone IS 'Parent/guardian phone for student accounts';
COMMENT ON COLUMN public.profiles.parent_guardian_email IS 'Parent/guardian email for student accounts';