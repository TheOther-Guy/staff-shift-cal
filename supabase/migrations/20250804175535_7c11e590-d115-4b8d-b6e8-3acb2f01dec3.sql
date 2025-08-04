-- Fix duplicate foreign key relationships by dropping the old ones and keeping the new ones

-- Drop old foreign key constraints that are causing ambiguity
ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_company_id_fkey;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_store_id_fkey;

-- The new foreign keys with proper names should remain:
-- fk_brands_company (brands -> companies)
-- fk_employees_store (employees -> stores)