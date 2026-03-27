
-- Series spaces: one per parent pair
CREATE TABLE public.series_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_a_id uuid NOT NULL,
  parent_b_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_a_id, parent_b_id)
);

ALTER TABLE public.series_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their series spaces" ON public.series_spaces
  FOR SELECT TO authenticated
  USING (auth.uid() = parent_a_id OR auth.uid() = parent_b_id);

CREATE POLICY "Users can create series spaces" ON public.series_spaces
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = parent_a_id OR auth.uid() = parent_b_id);

CREATE POLICY "Users can delete their series spaces" ON public.series_spaces
  FOR DELETE TO authenticated
  USING (auth.uid() = parent_a_id OR auth.uid() = parent_b_id);

-- Series messages
CREATE TABLE public.series_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.series_spaces(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message_text text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.series_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their spaces" ON public.series_messages
  FOR SELECT TO authenticated
  USING (space_id IN (SELECT id FROM public.series_spaces WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()));

CREATE POLICY "Users can insert messages in their spaces" ON public.series_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND space_id IN (SELECT id FROM public.series_spaces WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()));

CREATE POLICY "Users can update read status" ON public.series_messages
  FOR UPDATE TO authenticated
  USING (sender_id != auth.uid() AND space_id IN (SELECT id FROM public.series_spaces WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()));

-- Recurring rides
CREATE TABLE public.recurring_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.series_spaces(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  ride_type text NOT NULL CHECK (ride_type IN ('offer', 'request')),
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  pickup_latitude double precision NOT NULL,
  pickup_longitude double precision NOT NULL,
  dropoff_latitude double precision NOT NULL,
  dropoff_longitude double precision NOT NULL,
  ride_time time NOT NULL,
  recurring_days text[] NOT NULL,
  creator_children jsonb,
  recipient_children jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recurring rides in their spaces" ON public.recurring_rides
  FOR SELECT TO authenticated
  USING (space_id IN (SELECT id FROM public.series_spaces WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()));

CREATE POLICY "Users can create recurring rides" ON public.recurring_rides
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id AND space_id IN (SELECT id FROM public.series_spaces WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()));

CREATE POLICY "Users can update recurring rides in their spaces" ON public.recurring_rides
  FOR UPDATE TO authenticated
  USING (space_id IN (SELECT id FROM public.series_spaces WHERE parent_a_id = auth.uid() OR parent_b_id = auth.uid()));

CREATE POLICY "Users can delete recurring rides they created" ON public.recurring_rides
  FOR DELETE TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = recipient_id);

-- Recurring ride cancellations (single occurrence)
CREATE TABLE public.recurring_ride_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_ride_id uuid NOT NULL REFERENCES public.recurring_rides(id) ON DELETE CASCADE,
  cancelled_date date NOT NULL,
  cancelled_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurring_ride_id, cancelled_date)
);

ALTER TABLE public.recurring_ride_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cancellations in their spaces" ON public.recurring_ride_cancellations
  FOR SELECT TO authenticated
  USING (recurring_ride_id IN (
    SELECT rr.id FROM public.recurring_rides rr
    JOIN public.series_spaces ss ON ss.id = rr.space_id
    WHERE ss.parent_a_id = auth.uid() OR ss.parent_b_id = auth.uid()
  ));

CREATE POLICY "Users can create cancellations" ON public.recurring_ride_cancellations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = cancelled_by AND recurring_ride_id IN (
    SELECT rr.id FROM public.recurring_rides rr
    JOIN public.series_spaces ss ON ss.id = rr.space_id
    WHERE ss.parent_a_id = auth.uid() OR ss.parent_b_id = auth.uid()
  ));

-- Enable realtime for series_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.series_messages;
