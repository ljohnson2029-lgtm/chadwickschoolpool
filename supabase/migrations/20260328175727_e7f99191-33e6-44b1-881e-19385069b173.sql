
-- Allow students to view vehicles of parents they are linked to (and those parents' series partners)
CREATE POLICY "Students can view vehicles of linked parent series participants"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT al.parent_id FROM account_links al WHERE al.student_id = auth.uid() AND al.status = 'approved'
      UNION
      SELECT CASE WHEN ss.parent_a_id = al.parent_id THEN ss.parent_b_id ELSE ss.parent_a_id END
      FROM account_links al
      JOIN series_spaces ss ON ss.parent_a_id = al.parent_id OR ss.parent_b_id = al.parent_id
      WHERE al.student_id = auth.uid() AND al.status = 'approved'
    )
  );

-- Allow students to view series child selections for their linked parents' spaces
CREATE POLICY "Students can view series child selections of linked parents"
  ON public.series_child_selections FOR SELECT
  TO authenticated
  USING (
    space_id IN (
      SELECT ss.id FROM series_spaces ss
      JOIN account_links al ON (al.parent_id = ss.parent_a_id OR al.parent_id = ss.parent_b_id)
      WHERE al.student_id = auth.uid() AND al.status = 'approved'
    )
  );

-- Allow students to view children of parents in their linked parent's series spaces
CREATE POLICY "Students can view children of series space parents"
  ON public.children FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT CASE WHEN ss.parent_a_id = al.parent_id THEN ss.parent_b_id ELSE ss.parent_a_id END
      FROM account_links al
      JOIN series_spaces ss ON ss.parent_a_id = al.parent_id OR ss.parent_b_id = al.parent_id
      WHERE al.student_id = auth.uid() AND al.status = 'approved'
    )
  );
