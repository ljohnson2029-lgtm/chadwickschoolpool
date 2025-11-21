-- Allow users to view profiles of accounts they're linked to
-- This is needed for the linked accounts feature

-- Policy for students to view their linked parents' profiles
CREATE POLICY "Students can view linked parents profiles"
ON profiles FOR SELECT
USING (
  id IN (
    SELECT parent_id 
    FROM student_parent_links 
    WHERE student_id = auth.uid() 
    AND status = 'approved'
  )
);

-- Policy for parents to view their linked students' profiles
CREATE POLICY "Parents can view linked students profiles"
ON profiles FOR SELECT
USING (
  id IN (
    SELECT student_id 
    FROM student_parent_links 
    WHERE parent_id = auth.uid() 
    AND status = 'approved'
  )
);