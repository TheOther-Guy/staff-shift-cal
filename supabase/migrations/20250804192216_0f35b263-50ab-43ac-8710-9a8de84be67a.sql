-- Remove remaining duplicate foreign key constraints
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_store_id_fkey;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_company_id_fkey;