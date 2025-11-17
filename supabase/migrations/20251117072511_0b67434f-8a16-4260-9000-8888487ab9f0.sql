-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'parent', 'staff', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage roles"
ON public.user_roles
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create student_parent_links table
CREATE TABLE public.student_parent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (student_id, parent_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS on student_parent_links
ALTER TABLE public.student_parent_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_parent_links
CREATE POLICY "Users can view their own links"
ON public.student_parent_links
FOR SELECT
USING (auth.uid() = student_id OR auth.uid() = parent_id);

CREATE POLICY "Parents can update their link status"
ON public.student_parent_links
FOR UPDATE
USING (auth.uid() = parent_id);

CREATE POLICY "Students can create link requests"
ON public.student_parent_links
FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Service role can manage links"
ON public.student_parent_links
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');