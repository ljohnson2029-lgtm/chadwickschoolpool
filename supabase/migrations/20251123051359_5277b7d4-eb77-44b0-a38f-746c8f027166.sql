-- Add server-side validation for ride operations

-- Create function to check if user is a student (has @chadwickschool.org email)
CREATE OR REPLACE FUNCTION public.is_student_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT user_email LIKE '%@chadwickschool.org' 
    AND user_email != 'ljohnson2029@chadwickschool.org';
$$;

-- Create function to get user email by user_id
CREATE OR REPLACE FUNCTION public.get_user_email(user_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM users WHERE user_id = user_user_id;
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own rides" ON public.rides;
DROP POLICY IF EXISTS "Users can update their own rides" ON public.rides;
DROP POLICY IF EXISTS "Users can delete their own rides" ON public.rides;

-- Create new policy: Only parents can insert rides
CREATE POLICY "Only parents can insert rides"
  ON public.rides
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND NOT is_student_email(get_user_email(auth.uid()))
  );

-- Create new policy: Only parents can update their own rides
CREATE POLICY "Only parents can update their own rides"
  ON public.rides
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND NOT is_student_email(get_user_email(auth.uid()))
  );

-- Create new policy: Only parents can delete their own rides
CREATE POLICY "Only parents can delete their own rides"
  ON public.rides
  FOR DELETE
  USING (
    auth.uid() = user_id 
    AND NOT is_student_email(get_user_email(auth.uid()))
  );

-- Keep existing SELECT policy for viewing active rides
-- (already exists: "Everyone can view active rides")

-- Add comment for documentation
COMMENT ON FUNCTION public.is_student_email IS 'Checks if an email belongs to a student (@chadwickschool.org, excluding exemptions)';
COMMENT ON FUNCTION public.get_user_email IS 'Retrieves user email by user_id for permission checks';
