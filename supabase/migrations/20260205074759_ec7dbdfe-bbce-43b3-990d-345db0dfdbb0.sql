-- Add ride-level flag so clients can determine "Ride Full" without reading ride_conversations
ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS is_fulfilled boolean NOT NULL DEFAULT false;

-- Keep ride.is_fulfilled in sync when a conversation is accepted
CREATE OR REPLACE FUNCTION public.set_ride_fulfilled_from_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    UPDATE public.rides
    SET is_fulfilled = true
    WHERE id = NEW.ride_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ride_conversations_set_ride_fulfilled_ins ON public.ride_conversations;
DROP TRIGGER IF EXISTS trg_ride_conversations_set_ride_fulfilled_upd ON public.ride_conversations;

CREATE TRIGGER trg_ride_conversations_set_ride_fulfilled_ins
AFTER INSERT ON public.ride_conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_ride_fulfilled_from_conversation();

CREATE TRIGGER trg_ride_conversations_set_ride_fulfilled_upd
AFTER UPDATE OF status ON public.ride_conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_ride_fulfilled_from_conversation();

-- Backfill is_fulfilled for already-accepted rides
UPDATE public.rides r
SET is_fulfilled = true
WHERE EXISTS (
  SELECT 1 FROM public.ride_conversations rc
  WHERE rc.ride_id = r.id
    AND rc.status = 'accepted'
);