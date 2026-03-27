-- Allow conversation participants to delete their own conversations (for leave ride)
CREATE POLICY "Participants can delete their own conversations"
ON public.ride_conversations
FOR DELETE
TO public
USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);