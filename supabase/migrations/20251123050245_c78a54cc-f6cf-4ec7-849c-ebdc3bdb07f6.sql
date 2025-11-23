-- Create account_links table
CREATE TABLE public.account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign keys
  CONSTRAINT fk_student FOREIGN KEY (student_id) 
    REFERENCES public.users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_parent FOREIGN KEY (parent_id) 
    REFERENCES public.users(user_id) ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT unique_student_parent UNIQUE (student_id, parent_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'denied'))
);

-- Create indexes for account_links
CREATE INDEX idx_account_links_student ON public.account_links(student_id);
CREATE INDEX idx_account_links_parent ON public.account_links(parent_id);
CREATE INDEX idx_account_links_status ON public.account_links(status);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  link_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign keys
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) 
    REFERENCES public.users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_link FOREIGN KEY (link_id) 
    REFERENCES public.account_links(id) ON DELETE SET NULL
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- Enable RLS on both tables
ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for account_links
CREATE POLICY "Students can view their own link requests"
  ON public.account_links
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Parents can view their link requests"
  ON public.account_links
  FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Students can create link requests"
  ON public.account_links
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    status = 'pending'
  );

CREATE POLICY "Parents can update link status"
  ON public.account_links
  FOR UPDATE
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Students can delete their own links"
  ON public.account_links
  FOR DELETE
  USING (auth.uid() = student_id);

CREATE POLICY "Parents can delete their links"
  ON public.account_links
  FOR DELETE
  USING (auth.uid() = parent_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Helper function: Get linked parents for a student
CREATE OR REPLACE FUNCTION public.get_linked_parents(student_user_id UUID)
RETURNS TABLE (
  parent_id UUID,
  parent_email TEXT,
  parent_first_name TEXT,
  parent_last_name TEXT,
  linked_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    al.parent_id,
    u.email,
    u.first_name,
    u.last_name,
    al.created_at as linked_at
  FROM account_links al
  JOIN users u ON u.user_id = al.parent_id
  WHERE al.student_id = student_user_id 
    AND al.status = 'approved';
$$;

-- Helper function: Get linked students for a parent
CREATE OR REPLACE FUNCTION public.get_linked_students(parent_user_id UUID)
RETURNS TABLE (
  student_id UUID,
  student_email TEXT,
  student_first_name TEXT,
  student_last_name TEXT,
  linked_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    al.student_id,
    u.email,
    u.first_name,
    u.last_name,
    al.created_at as linked_at
  FROM account_links al
  JOIN users u ON u.user_id = al.student_id
  WHERE al.parent_id = parent_user_id 
    AND al.status = 'approved';
$$;

-- Helper function: Check if link exists and is approved
CREATE OR REPLACE FUNCTION public.is_link_approved(student_user_id UUID, parent_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM account_links
    WHERE student_id = student_user_id
      AND parent_id = parent_user_id
      AND status = 'approved'
  );
$$;

-- Helper function: Validate student email
CREATE OR REPLACE FUNCTION public.is_valid_student_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT email LIKE '%@chadwickschool.org' 
    AND email != 'ljohnson2029@chadwickschool.org';
$$;

-- Helper function: Validate parent email
CREATE OR REPLACE FUNCTION public.is_valid_parent_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NOT (email LIKE '%@chadwickschool.org')
    OR email = 'ljohnson2029@chadwickschool.org';
$$;

-- Trigger to update updated_at on account_links
CREATE TRIGGER update_account_links_updated_at
  BEFORE UPDATE ON public.account_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.account_links IS 'Links between student and parent accounts with approval status';
COMMENT ON TABLE public.notifications IS 'System notifications for users about account linking and other events';
COMMENT ON FUNCTION public.get_linked_parents IS 'Returns all approved parent accounts linked to a student';
COMMENT ON FUNCTION public.get_linked_students IS 'Returns all approved student accounts linked to a parent';
COMMENT ON FUNCTION public.is_link_approved IS 'Checks if a student-parent link exists and is approved';
COMMENT ON FUNCTION public.is_valid_student_email IS 'Validates if email is a valid student email (@chadwickschool.org, excluding exemptions)';
COMMENT ON FUNCTION public.is_valid_parent_email IS 'Validates if email is a valid parent email (not @chadwickschool.org or is exempted)';