CREATE POLICY "Students can update link status"
ON public.account_links
FOR UPDATE
TO public
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);