-- Add read_at timestamp for read receipts
ALTER TABLE public.ride_conversations 
ADD COLUMN IF NOT EXISTS read_at timestamp with time zone DEFAULT NULL;

-- Add index for faster querying
CREATE INDEX IF NOT EXISTS idx_ride_conversations_participants 
ON public.ride_conversations(sender_id, recipient_id);

CREATE INDEX IF NOT EXISTS idx_ride_conversations_ride_id 
ON public.ride_conversations(ride_id);

-- Enable realtime for ride_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_conversations;

-- Add comment
COMMENT ON COLUMN public.ride_conversations.read_at IS 'Timestamp when recipient first viewed this conversation';