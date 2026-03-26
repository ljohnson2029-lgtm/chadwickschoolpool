
ALTER TABLE public.rides ADD COLUMN selected_children jsonb DEFAULT NULL;
ALTER TABLE public.ride_conversations ADD COLUMN selected_children jsonb DEFAULT NULL;
