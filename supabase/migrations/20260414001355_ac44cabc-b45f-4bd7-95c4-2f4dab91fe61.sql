
-- =====================================================
-- FIX 1: Users table - remove overly permissive policy
-- =====================================================

-- Drop the dangerous broad policy
DROP POLICY IF EXISTS "Deny anonymous access to users" ON public.users;

-- Users can always view their own row
CREATE POLICY "Users can view their own data"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Ride conversation participants can view each other's user data
CREATE POLICY "Ride conversation participants can view user data"
ON public.users
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT rc.sender_id FROM ride_conversations rc
    WHERE rc.recipient_id = auth.uid()
    UNION
    SELECT rc.recipient_id FROM ride_conversations rc
    WHERE rc.sender_id = auth.uid()
    UNION
    SELECT r.user_id FROM rides r
    JOIN ride_conversations rc ON rc.ride_id = r.id
    WHERE (rc.sender_id = auth.uid() OR rc.recipient_id = auth.uid())
  )
);

-- Private ride request participants can view each other's user data
CREATE POLICY "Private ride participants can view user data"
ON public.users
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT pr.sender_id FROM private_ride_requests pr
    WHERE pr.recipient_id = auth.uid()
    UNION
    SELECT pr.recipient_id FROM private_ride_requests pr
    WHERE pr.sender_id = auth.uid()
  )
);

-- Users can view ride creators' data (for browsing active rides)
CREATE POLICY "Users can view ride creators data"
ON public.users
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT r.user_id FROM rides r WHERE r.status = 'active'
  )
);

-- Series space partners can view each other's user data
CREATE POLICY "Series partners can view user data"
ON public.users
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT CASE WHEN ss.parent_a_id = auth.uid() THEN ss.parent_b_id ELSE ss.parent_a_id END
    FROM series_spaces ss
    WHERE ss.parent_a_id = auth.uid() OR ss.parent_b_id = auth.uid()
  )
);

-- =====================================================
-- FIX 3: Hide verification codes from the wrong party
-- =====================================================

-- Drop existing open SELECT policy
DROP POLICY IF EXISTS "Users can view their own links" ON public.student_parent_links;

-- Parents can see their links but NOT the verification code
CREATE POLICY "Parents can view their links without codes"
ON public.student_parent_links
FOR SELECT
TO authenticated
USING (auth.uid() = parent_id);

-- Students can see their links (they need the code to verify)
CREATE POLICY "Students can view their own links"
ON public.student_parent_links
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);
