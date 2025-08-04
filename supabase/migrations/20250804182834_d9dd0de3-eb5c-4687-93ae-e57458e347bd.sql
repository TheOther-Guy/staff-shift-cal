-- First, update any existing location_manager roles to store_manager
UPDATE profiles SET role = 'store_manager' WHERE role = 'location_manager';

-- Remove the default constraint temporarily
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Now update the enum
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('admin', 'company_manager', 'brand_manager', 'store_manager');

-- Update the column to use the new enum
ALTER TABLE profiles ALTER COLUMN role TYPE user_role USING role::text::user_role;

-- Add back the default
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'store_manager'::user_role;

-- Clean up
DROP TYPE user_role_old;