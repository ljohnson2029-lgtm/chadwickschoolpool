-- Create schools table for storing school locations
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  school_type TEXT CHECK (school_type IN ('elementary', 'middle', 'high', 'k-12', 'preschool')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view schools
CREATE POLICY "Schools are viewable by everyone"
ON public.schools FOR SELECT
USING (true);

-- Only authenticated users can suggest new schools
CREATE POLICY "Authenticated users can insert schools"
ON public.schools FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for location-based queries
CREATE INDEX idx_schools_location ON public.schools(latitude, longitude);

-- Insert some sample schools in the Palos Verdes/South Bay area
INSERT INTO public.schools (name, address, city, state, zip_code, latitude, longitude, school_type) VALUES
('Chadwick School', '26800 Academy Dr', 'Palos Verdes Peninsula', 'CA', '90274', 33.7447, -118.3964, 'k-12'),
('Palos Verdes High School', '600 Cloyden Rd', 'Palos Verdes Estates', 'CA', '90274', 33.7889, -118.3978, 'high'),
('Peninsula High School', '27118 Silver Spur Rd', 'Rolling Hills Estates', 'CA', '90274', 33.7678, -118.3567, 'high'),
('Rancho Vista Elementary', '30551 Cartier Dr', 'Rancho Palos Verdes', 'CA', '90275', 33.7556, -118.3689, 'elementary'),
('Dapplegray Elementary', '29232 Fond Du Lac Rd', 'Rancho Palos Verdes', 'CA', '90275', 33.7389, -118.3544, 'elementary'),
('Ridgecrest Intermediate', '28915 Northbay Rd', 'Rancho Palos Verdes', 'CA', '90275', 33.7478, -118.3678, 'middle');