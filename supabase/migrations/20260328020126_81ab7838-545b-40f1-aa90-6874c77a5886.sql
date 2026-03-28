
CREATE TABLE public.series_child_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.series_spaces(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (space_id, parent_id, child_id)
);

ALTER TABLE public.series_child_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view selections in their spaces"
ON public.series_child_selections FOR SELECT TO authenticated
USING (space_id IN (
  SELECT id FROM public.series_spaces
  WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()
));

CREATE POLICY "Users can insert selections in their spaces"
ON public.series_child_selections FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = parent_id
  AND space_id IN (
    SELECT id FROM public.series_spaces
    WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own selections"
ON public.series_child_selections FOR DELETE TO authenticated
USING (auth.uid() = parent_id);
