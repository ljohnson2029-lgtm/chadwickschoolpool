-- Update profiles table with carpool-specific fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS home_address TEXT,
ADD COLUMN IF NOT EXISTS car_make TEXT,
ADD COLUMN IF NOT EXISTS car_model TEXT,
ADD COLUMN IF NOT EXISTS car_seats INTEGER;

-- Create children table
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  school TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rides table (for both requests and offers)
CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('request', 'offer')),
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  ride_date DATE NOT NULL,
  ride_time TIME NOT NULL,
  seats_needed INTEGER,
  seats_available INTEGER,
  route_details TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_days TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for children
CREATE POLICY "Users can view their own children"
  ON children FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own children"
  ON children FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own children"
  ON children FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own children"
  ON children FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for rides
CREATE POLICY "Everyone can view active rides"
  ON rides FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can insert their own rides"
  ON rides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rides"
  ON rides FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rides"
  ON rides FOR DELETE
  USING (auth.uid() = user_id);