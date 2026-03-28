
CREATE OR REPLACE FUNCTION public.get_student_series_rides(student_user_id uuid)
RETURNS TABLE(
  schedule_id uuid,
  space_id uuid,
  proposer_id uuid,
  recipient_id uuid,
  day_assignments jsonb,
  proposer_regular_time time,
  proposer_wednesday_time time,
  recipient_regular_time time,
  recipient_wednesday_time time,
  schedule_status text,
  parent_a_id uuid,
  parent_b_id uuid,
  cancelled_date date,
  cancelled_day text,
  cancelled_schedule_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Get accepted schedules from series spaces where a linked parent is involved
  WITH linked_parents AS (
    SELECT parent_id FROM account_links
    WHERE student_id = student_user_id AND status = 'approved'
  ),
  parent_spaces AS (
    SELECT ss.id as space_id, ss.parent_a_id, ss.parent_b_id
    FROM series_spaces ss
    WHERE ss.parent_a_id IN (SELECT parent_id FROM linked_parents)
       OR ss.parent_b_id IN (SELECT parent_id FROM linked_parents)
  ),
  active_schedules AS (
    SELECT rs.*
    FROM recurring_schedules rs
    JOIN parent_spaces ps ON ps.space_id = rs.space_id
    WHERE rs.status = 'accepted'
  )
  SELECT
    s.id as schedule_id,
    s.space_id,
    s.proposer_id,
    s.recipient_id,
    s.day_assignments,
    s.proposer_regular_time,
    s.proposer_wednesday_time,
    s.recipient_regular_time,
    s.recipient_wednesday_time,
    s.status as schedule_status,
    ps.parent_a_id,
    ps.parent_b_id,
    sc.cancelled_date,
    sc.cancelled_day,
    sc.schedule_id as cancelled_schedule_id
  FROM active_schedules s
  JOIN parent_spaces ps ON ps.space_id = s.space_id
  LEFT JOIN schedule_cancellations sc ON sc.schedule_id = s.id
  WHERE auth.uid() = student_user_id;
$$;
