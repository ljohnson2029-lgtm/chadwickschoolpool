-- Add grade_level column to profiles table
ALTER TABLE public.profiles
ADD COLUMN grade_level text;

-- Add a check constraint to validate grade levels
ALTER TABLE public.profiles
ADD CONSTRAINT valid_grade_level CHECK (
  grade_level IS NULL OR
  grade_level IN (
    'Pre-K', 'Kindergarten', 
    '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade',
    '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade',
    'Parent/Adult'
  )
);