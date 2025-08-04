-- Update user_role enum to remove location_manager
ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM ('admin', 'company_manager', 'brand_manager', 'store_manager');

-- Update profiles table to use new enum and handle any existing location_manager roles
ALTER TABLE profiles 
  ALTER COLUMN role TYPE user_role USING 
    CASE 
      WHEN role::text = 'location_manager' THEN 'store_manager'::user_role
      ELSE role::text::user_role
    END;

DROP TYPE user_role_old;