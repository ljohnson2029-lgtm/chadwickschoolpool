CREATE POLICY "Series space partners can view each other's profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT CASE WHEN ss.parent_a_id = auth.uid() THEN ss.parent_b_id ELSE ss.parent_a_id END
    FROM public.series_spaces ss
    WHERE ss.parent_a_id = auth.uid() OR ss.parent_b_id = auth.uid()
  )
);