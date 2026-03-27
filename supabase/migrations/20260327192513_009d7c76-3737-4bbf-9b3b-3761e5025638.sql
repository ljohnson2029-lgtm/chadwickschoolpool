
-- Create vehicles table
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  car_make text NOT NULL,
  car_model text NOT NULL,
  car_color text NOT NULL,
  license_plate text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own vehicles" ON public.vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own vehicles" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vehicles" ON public.vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vehicles" ON public.vehicles FOR DELETE USING (auth.uid() = user_id);

-- Allow viewing vehicles of ride participants (for ride cards)
CREATE POLICY "View vehicles of ride conversation participants" ON public.vehicles FOR SELECT USING (
  user_id IN (
    SELECT rc.sender_id FROM ride_conversations rc WHERE rc.recipient_id = auth.uid() AND rc.status = 'accepted'
    UNION
    SELECT rc.recipient_id FROM ride_conversations rc WHERE rc.sender_id = auth.uid() AND rc.status = 'accepted'
    UNION
    SELECT r.user_id FROM rides r JOIN ride_conversations rc ON rc.ride_id = r.id WHERE (rc.sender_id = auth.uid() OR rc.recipient_id = auth.uid()) AND rc.status = 'accepted'
  )
);

CREATE POLICY "View vehicles of private ride participants" ON public.vehicles FOR SELECT USING (
  user_id IN (
    SELECT pr.sender_id FROM private_ride_requests pr WHERE pr.recipient_id = auth.uid() AND pr.status IN ('accepted', 'completed')
    UNION
    SELECT pr.recipient_id FROM private_ride_requests pr WHERE pr.sender_id = auth.uid() AND pr.status IN ('accepted', 'completed')
  )
);

-- Add vehicle_info JSONB to rides and private_ride_requests for snapshot
ALTER TABLE public.rides ADD COLUMN vehicle_info jsonb;
ALTER TABLE public.private_ride_requests ADD COLUMN vehicle_info jsonb;

-- Migrate existing profile vehicle data into vehicles table
INSERT INTO public.vehicles (user_id, car_make, car_model, car_color, license_plate, is_primary)
SELECT id, car_make, car_model, car_color, license_plate, true
FROM public.profiles
WHERE car_make IS NOT NULL AND car_make != ''
  AND car_model IS NOT NULL AND car_model != ''
  AND account_type = 'parent';
