-- Fix swapped latitude/longitude coordinates in profiles table
-- Palos Verdes area: latitude should be ~33-34, longitude should be ~-118 to -119
-- If latitude is around -118 and longitude is around 33, they're swapped

-- Swap coordinates where they appear to be reversed (for Palos Verdes/LA area)
UPDATE profiles
SET 
  home_latitude = home_longitude,
  home_longitude = home_latitude
WHERE 
  home_latitude IS NOT NULL 
  AND home_longitude IS NOT NULL
  AND home_latitude < -100  -- Latitude is clearly a longitude value (negative ~118)
  AND home_longitude > 0    -- Longitude is clearly a latitude value (positive ~33)
  AND home_longitude < 50;  -- Reasonable latitude range

-- Add a comment for tracking
COMMENT ON COLUMN profiles.home_latitude IS 'Latitude coordinate (should be between -90 and 90, ~33-34 for Palos Verdes area)';
COMMENT ON COLUMN profiles.home_longitude IS 'Longitude coordinate (should be between -180 and 180, ~-118 to -119 for Palos Verdes area)';