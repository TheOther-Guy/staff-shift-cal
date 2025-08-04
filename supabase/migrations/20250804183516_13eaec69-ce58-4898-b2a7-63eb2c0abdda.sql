-- Remove duplicate foreign key constraint for stores->brands relationship
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_brand_id_fkey;

-- Also check and clean up any potential duplicates in employees table
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_store_id_fkey;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_company_id_fkey;