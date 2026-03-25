
-- Allow students to view profiles of their linked parents via account_links
CREATE POLICY "Students can view linked parents profiles via account_links"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT al.parent_id
    FROM account_links al
    WHERE al.student_id = auth.uid()
      AND al.status = 'approved'
  )
);

-- Allow parents to view profiles of their linked students via account_links
CREATE POLICY "Parents can view linked students profiles via account_links"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT al.student_id
    FROM account_links al
    WHERE al.parent_id = auth.uid()
      AND al.status = 'approved'
  )
);
