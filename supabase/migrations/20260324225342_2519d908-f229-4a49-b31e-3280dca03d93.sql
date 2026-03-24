CREATE POLICY "Students can view children of connected ride parents"
ON public.children FOR SELECT
USING (
  user_id IN (
    SELECT rc.sender_id FROM public.ride_conversations rc
    JOIN public.rides r ON r.id = rc.ride_id
    JOIN public.account_links al ON al.parent_id = r.user_id AND al.student_id = auth.uid() AND al.status = 'approved'
    WHERE rc.status = 'accepted'
    UNION
    SELECT rc.recipient_id FROM public.ride_conversations rc
    JOIN public.rides r ON r.id = rc.ride_id
    JOIN public.account_links al ON al.parent_id = r.user_id AND al.student_id = auth.uid() AND al.status = 'approved'
    WHERE rc.status = 'accepted'
    UNION
    SELECT r.user_id FROM public.rides r
    JOIN public.ride_conversations rc ON rc.ride_id = r.id AND rc.status = 'accepted'
    JOIN public.account_links al ON al.parent_id = rc.sender_id AND al.student_id = auth.uid() AND al.status = 'approved'
  )
);