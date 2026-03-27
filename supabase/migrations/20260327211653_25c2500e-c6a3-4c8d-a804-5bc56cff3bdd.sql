
-- Create ride_messages table for in-ride chat
CREATE TABLE public.ride_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_ref_id uuid NOT NULL,
  ride_source text NOT NULL CHECK (ride_source IN ('public', 'private')),
  sender_id uuid NOT NULL,
  message_text text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;

-- Participants of public rides can view messages
CREATE POLICY "View messages for public rides" ON public.ride_messages
  FOR SELECT USING (
    ride_source = 'public' AND (
      sender_id = auth.uid()
      OR ride_ref_id IN (
        SELECT id FROM public.rides WHERE user_id = auth.uid()
      )
      OR ride_ref_id IN (
        SELECT ride_id FROM public.ride_conversations
        WHERE (sender_id = auth.uid() OR recipient_id = auth.uid()) AND status = 'accepted'
      )
    )
  );

-- Participants of private rides can view messages
CREATE POLICY "View messages for private rides" ON public.ride_messages
  FOR SELECT USING (
    ride_source = 'private' AND (
      sender_id = auth.uid()
      OR ride_ref_id IN (
        SELECT id FROM public.private_ride_requests
        WHERE (sender_id = auth.uid() OR recipient_id = auth.uid()) AND status IN ('accepted', 'completed')
      )
    )
  );

-- Students can view messages for rides of their linked parents (public)
CREATE POLICY "Students view messages of linked parent rides" ON public.ride_messages
  FOR SELECT USING (
    ride_source = 'public' AND ride_ref_id IN (
      SELECT r.id FROM public.rides r
      JOIN public.account_links al ON al.parent_id = r.user_id AND al.student_id = auth.uid() AND al.status = 'approved'
      WHERE r.status = 'active'
    )
  );

-- Students can view messages for private rides of linked parents
CREATE POLICY "Students view messages of linked parent private rides" ON public.ride_messages
  FOR SELECT USING (
    ride_source = 'private' AND ride_ref_id IN (
      SELECT pr.id FROM public.private_ride_requests pr
      JOIN public.account_links al ON (al.parent_id = pr.sender_id OR al.parent_id = pr.recipient_id)
        AND al.student_id = auth.uid() AND al.status = 'approved'
      WHERE pr.status IN ('accepted', 'completed')
    )
  );

-- Authenticated parents can insert messages for rides they participate in
CREATE POLICY "Insert messages for public rides" ON public.ride_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND ride_source = 'public' AND NOT is_student_email(get_user_email(auth.uid()))
    AND (
      ride_ref_id IN (SELECT id FROM public.rides WHERE user_id = auth.uid())
      OR ride_ref_id IN (
        SELECT ride_id FROM public.ride_conversations
        WHERE (sender_id = auth.uid() OR recipient_id = auth.uid()) AND status = 'accepted'
      )
    )
  );

CREATE POLICY "Insert messages for private rides" ON public.ride_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND ride_source = 'private' AND NOT is_student_email(get_user_email(auth.uid()))
    AND ride_ref_id IN (
      SELECT id FROM public.private_ride_requests
      WHERE (sender_id = auth.uid() OR recipient_id = auth.uid()) AND status IN ('accepted', 'completed')
    )
  );

-- Users can update their own messages (mark as read)
CREATE POLICY "Update own messages read status" ON public.ride_messages
  FOR UPDATE USING (
    sender_id != auth.uid() AND (
      (ride_source = 'public' AND (
        ride_ref_id IN (SELECT id FROM public.rides WHERE user_id = auth.uid())
        OR ride_ref_id IN (SELECT ride_id FROM public.ride_conversations WHERE (sender_id = auth.uid() OR recipient_id = auth.uid()) AND status = 'accepted')
      ))
      OR (ride_source = 'private' AND ride_ref_id IN (
        SELECT id FROM public.private_ride_requests WHERE (sender_id = auth.uid() OR recipient_id = auth.uid()) AND status IN ('accepted', 'completed')
      ))
    )
  );

-- Ride owners can delete messages when ride is cancelled
CREATE POLICY "Delete messages for own rides" ON public.ride_messages
  FOR DELETE USING (
    sender_id = auth.uid()
    OR (ride_source = 'public' AND ride_ref_id IN (SELECT id FROM public.rides WHERE user_id = auth.uid()))
    OR (ride_source = 'private' AND ride_ref_id IN (
      SELECT id FROM public.private_ride_requests WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
    ))
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;
