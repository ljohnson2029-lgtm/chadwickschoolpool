-- Allow students to read series child selections for any series space involving an approved linked parent
CREATE POLICY "Students can view linked parent series selections v2"
ON public.series_child_selections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.series_spaces ss
    JOIN public.account_links al
      ON (al.parent_id = ss.parent_a_id OR al.parent_id = ss.parent_b_id)
    WHERE ss.id = public.series_child_selections.space_id
      AND al.student_id = auth.uid()
      AND al.status = 'approved'
  )
);

-- Security-definer helper for student series child selections to avoid client-side RLS edge cases
CREATE OR REPLACE FUNCTION public.get_student_series_child_selections(student_user_id uuid)
RETURNS TABLE(space_id uuid, parent_id uuid, child_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH linked_parents AS (
    SELECT parent_id
    FROM public.account_links
    WHERE student_id = student_user_id
      AND status = 'approved'
  ), parent_spaces AS (
    SELECT ss.id AS space_id
    FROM public.series_spaces ss
    WHERE ss.parent_a_id IN (SELECT parent_id FROM linked_parents)
       OR ss.parent_b_id IN (SELECT parent_id FROM linked_parents)
  )
  SELECT scs.space_id, scs.parent_id, scs.child_id
  FROM public.series_child_selections scs
  JOIN parent_spaces ps ON ps.space_id = scs.space_id
  WHERE auth.uid() = student_user_id;
$function$;