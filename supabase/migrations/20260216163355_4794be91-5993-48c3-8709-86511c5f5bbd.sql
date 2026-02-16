
-- Add first_name, last_name, grade_level to children table
-- Keep existing 'name' column data, split into first/last name
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS grade_level text;

-- Migrate existing 'name' data to first_name (put full name in first_name for now)
UPDATE public.children SET first_name = name WHERE first_name IS NULL;
UPDATE public.children SET last_name = '' WHERE last_name IS NULL;
UPDATE public.children SET grade_level = school WHERE grade_level IS NULL;

-- Make first_name NOT NULL with default
ALTER TABLE public.children ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.children ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE public.children ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE public.children ALTER COLUMN last_name SET DEFAULT '';
