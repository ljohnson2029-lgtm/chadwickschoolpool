CREATE POLICY "Series space partners can view each other's children"
ON public.children
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT CASE
      WHEN ss.parent_a_id = auth.uid() THEN ss.parent_b_id
      ELSE ss.parent_a_id
    END
    FROM series_spaces ss
    WHERE ss.parent_a_id = auth.uid() OR ss.parent_b_id = auth.uid()
  )
);