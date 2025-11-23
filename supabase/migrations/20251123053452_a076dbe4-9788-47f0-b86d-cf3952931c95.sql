-- Allow parents to view their linked students' user data
CREATE POLICY "Parents can view linked students user data"
ON public.users
FOR SELECT
USING (
  user_id IN (
    SELECT student_id
    FROM account_links
    WHERE parent_id = auth.uid()
    AND status = 'approved'
  )
);

-- Allow students to view their linked parents' user data
CREATE POLICY "Students can view linked parents user data"
ON public.users
FOR SELECT
USING (
  user_id IN (
    SELECT parent_id
    FROM account_links
    WHERE student_id = auth.uid()
    AND status = 'approved'
  )
);