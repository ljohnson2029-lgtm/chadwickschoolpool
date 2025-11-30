-- Create enums for private ride requests
CREATE TYPE public.private_request_type AS ENUM ('request', 'offer');
CREATE TYPE public.private_request_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'completed');

-- Create private_ride_requests table for map-based direct requests
CREATE TABLE public.private_ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request metadata
  request_type public.private_request_type NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  status public.private_request_status NOT NULL DEFAULT 'pending',
  
  -- Schedule information
  ride_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  is_round_trip BOOLEAN NOT NULL DEFAULT false,
  return_time TIME,
  
  -- Location information
  pickup_address TEXT NOT NULL,
  pickup_latitude DECIMAL(10,8) NOT NULL,
  pickup_longitude DECIMAL(11,8) NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_latitude DECIMAL(10,8) NOT NULL,
  dropoff_longitude DECIMAL(11,8) NOT NULL,
  
  -- Capacity information
  seats_needed INTEGER,
  seats_offered INTEGER,
  
  -- Additional details
  message TEXT,
  distance_from_route DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT no_self_request CHECK (sender_id != recipient_id),
  CONSTRAINT seats_required CHECK (seats_needed > 0 OR seats_offered > 0),
  CONSTRAINT unique_request UNIQUE (sender_id, recipient_id, ride_date, pickup_time)
);

-- Create indexes for performance
CREATE INDEX idx_private_requests_sender ON public.private_ride_requests(sender_id);
CREATE INDEX idx_private_requests_recipient ON public.private_ride_requests(recipient_id);
CREATE INDEX idx_private_requests_status ON public.private_ride_requests(status);
CREATE INDEX idx_private_requests_date ON public.private_ride_requests(ride_date);
CREATE INDEX idx_private_requests_recipient_status ON public.private_ride_requests(recipient_id, status);

-- Enable Row Level Security
ALTER TABLE public.private_ride_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view requests they sent or received
CREATE POLICY "Users can view their own requests"
ON public.private_ride_requests
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- RLS Policy: Parents can create requests
CREATE POLICY "Parents can create requests"
ON public.private_ride_requests
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND NOT is_student_email(get_user_email(auth.uid()))
);

-- RLS Policy: Recipients can update status
CREATE POLICY "Recipients can update status"
ON public.private_ride_requests
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- RLS Policy: Senders can cancel pending requests
CREATE POLICY "Senders can cancel pending"
ON public.private_ride_requests
FOR UPDATE
USING (auth.uid() = sender_id AND status = 'pending')
WITH CHECK (auth.uid() = sender_id AND status = 'pending');

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_private_requests_updated_at
BEFORE UPDATE ON public.private_ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: Get pending request count for user
CREATE OR REPLACE FUNCTION public.get_pending_requests_count(user_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.private_ride_requests
  WHERE recipient_id = user_user_id
    AND status = 'pending';
$$;

-- Helper function: Check for duplicate requests
CREATE OR REPLACE FUNCTION public.check_duplicate_private_request(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_ride_date DATE,
  p_pickup_time TIME
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.private_ride_requests
    WHERE sender_id = p_sender_id
      AND recipient_id = p_recipient_id
      AND ride_date = p_ride_date
      AND pickup_time = p_pickup_time
      AND status IN ('pending', 'accepted')
  );
$$;