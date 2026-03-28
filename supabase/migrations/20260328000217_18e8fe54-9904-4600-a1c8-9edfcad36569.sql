
-- Create recurring_schedules table for weekly carpool schedule proposals
CREATE TABLE public.recurring_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.series_spaces(id) ON DELETE CASCADE,
  proposer_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  -- JSONB array of {day, driver_id} objects e.g. [{"day":"Mon","driver_id":"uuid"},...]
  day_assignments jsonb NOT NULL,
  -- Proposer's pickup times
  proposer_regular_time time WITHOUT TIME ZONE,
  proposer_wednesday_time time WITHOUT TIME ZONE,
  -- Recipient's pickup times (set by recipient on acceptance)
  recipient_regular_time time WITHOUT TIME ZONE,
  recipient_wednesday_time time WITHOUT TIME ZONE,
  -- Children selections
  proposer_children jsonb NOT NULL DEFAULT '[]'::jsonb,
  recipient_children jsonb DEFAULT NULL,
  -- Vehicle info for each parent (auto-pulled from primary vehicle)
  proposer_vehicle jsonb DEFAULT NULL,
  recipient_vehicle jsonb DEFAULT NULL,
  -- Status: pending, accepted, declined, cancelled
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view schedules in their spaces"
ON public.recurring_schedules FOR SELECT TO authenticated
USING (space_id IN (
  SELECT id FROM public.series_spaces
  WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()
));

CREATE POLICY "Users can create schedules in their spaces"
ON public.recurring_schedules FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = proposer_id
  AND space_id IN (
    SELECT id FROM public.series_spaces
    WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()
  )
);

CREATE POLICY "Users can update schedules in their spaces"
ON public.recurring_schedules FOR UPDATE TO authenticated
USING (space_id IN (
  SELECT id FROM public.series_spaces
  WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()
));

CREATE POLICY "Users can delete schedules in their spaces"
ON public.recurring_schedules FOR DELETE TO authenticated
USING (space_id IN (
  SELECT id FROM public.series_spaces
  WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()
));

-- Create cancellations table for schedule occurrences
CREATE TABLE public.schedule_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.recurring_schedules(id) ON DELETE CASCADE,
  cancelled_date date NOT NULL,
  cancelled_day text NOT NULL,
  cancelled_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, cancelled_date, cancelled_day)
);

ALTER TABLE public.schedule_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schedule cancellations"
ON public.schedule_cancellations FOR SELECT TO authenticated
USING (schedule_id IN (
  SELECT rs.id FROM public.recurring_schedules rs
  JOIN public.series_spaces ss ON ss.id = rs.space_id
  WHERE ss.parent_a_id = auth.uid() OR ss.parent_b_id = auth.uid()
));

CREATE POLICY "Users can create schedule cancellations"
ON public.schedule_cancellations FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = cancelled_by
  AND schedule_id IN (
    SELECT rs.id FROM public.recurring_schedules rs
    JOIN public.series_spaces ss ON ss.id = rs.space_id
    WHERE ss.parent_a_id = auth.uid() OR ss.parent_b_id = auth.uid()
  )
);
