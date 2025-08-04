-- Remove duplicate foreign key constraint for brands
ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_company_id_fkey;