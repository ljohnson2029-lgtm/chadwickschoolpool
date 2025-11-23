-- Add account_type column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN account_type TEXT;

-- Add CHECK constraint to ensure only 'parent' or 'student' values
ALTER TABLE public.profiles 
ADD CONSTRAINT account_type_check 
CHECK (account_type IN ('parent', 'student'));

-- Update existing users based on their email domain
-- Join with users table to get email addresses
UPDATE public.profiles
SET account_type = CASE 
  WHEN u.email LIKE '%@chadwickschool.org' AND u.email != 'ljohnson2029@chadwickschool.org' 
    THEN 'student'
  ELSE 'parent'
END
FROM public.users u
WHERE profiles.id = u.user_id;

-- Make account_type NOT NULL after setting values
ALTER TABLE public.profiles 
ALTER COLUMN account_type SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.account_type IS 'User account type: student (@chadwickschool.org) or parent (all others). Immutable after creation.';