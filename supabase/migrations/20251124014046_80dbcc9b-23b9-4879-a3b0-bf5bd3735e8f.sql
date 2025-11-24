-- Create co_parent_links table for adult-to-adult family linking
CREATE TABLE IF NOT EXISTS public.co_parent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(requester_id, recipient_id)
);

-- Enable RLS
ALTER TABLE public.co_parent_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for co_parent_links
CREATE POLICY "Users can view their own co-parent links"
  ON public.co_parent_links
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create co-parent link requests"
  ON public.co_parent_links
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');

CREATE POLICY "Recipients can update link status"
  ON public.co_parent_links
  FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete their co-parent links"
  ON public.co_parent_links
  FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Create index for faster lookups
CREATE INDEX idx_co_parent_links_requester ON public.co_parent_links(requester_id);
CREATE INDEX idx_co_parent_links_recipient ON public.co_parent_links(recipient_id);
CREATE INDEX idx_co_parent_links_status ON public.co_parent_links(status);

-- Add notification types for co-parent linking
COMMENT ON TABLE public.co_parent_links IS 'Manages adult-to-adult family account linking for co-parents';