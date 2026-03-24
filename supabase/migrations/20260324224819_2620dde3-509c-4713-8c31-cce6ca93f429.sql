CREATE POLICY "Students can view children of linked parents"
ON public.children FOR SELECT
USING (
  user_id IN (
    SELECT al.parent_id
    FROM public.account_links al
    WHERE al.student_id = auth.uid()
      AND al.status = 'approved'
  )
);