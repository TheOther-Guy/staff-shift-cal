-- Remove location functionality completely

-- Drop brand_locations table (it was created for location management)
DROP TABLE IF EXISTS brand_locations CASCADE;

-- Remove location-related columns from stores
ALTER TABLE stores DROP COLUMN IF EXISTS location_id CASCADE;

-- Remove location-related columns from profiles  
ALTER TABLE profiles DROP COLUMN IF EXISTS location_id CASCADE;

-- Drop locations table
DROP TABLE IF EXISTS locations CASCADE;

-- Drop location-related function
DROP FUNCTION IF EXISTS get_user_location_id() CASCADE;