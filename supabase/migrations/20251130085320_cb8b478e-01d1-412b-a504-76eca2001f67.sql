-- Add transaction_type to rides table to distinguish between broadcast and direct rides
DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('broadcast', 'direct');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to rides table
ALTER TABLE public.rides 
ADD COLUMN IF NOT EXISTS transaction_type public.transaction_type DEFAULT 'broadcast',
ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_rides_transaction_type ON public.rides(transaction_type);
CREATE INDEX IF NOT EXISTS idx_rides_recipient_id ON public.rides(recipient_id);

-- Create conversations table for tracking direct ride negotiations
CREATE TABLE IF NOT EXISTS public.ride_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(ride_id, sender_id, recipient_id)
);

-- Enable RLS on ride_conversations
ALTER TABLE public.ride_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ride_conversations
CREATE POLICY "Users can view conversations they're part of"
ON public.ride_conversations
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create conversations"
ON public.ride_conversations
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Participants can update conversation status"
ON public.ride_conversations
FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Add trigger for updated_at
CREATE TRIGGER update_ride_conversations_updated_at
  BEFORE UPDATE ON public.ride_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to explain the table
COMMENT ON TABLE public.ride_conversations IS 'Tracks direct ride negotiations between parents when responding to broadcast posts or sending direct requests';

-- Update existing rides to be broadcast by default
UPDATE public.rides SET transaction_type = 'broadcast' WHERE transaction_type IS NULL;