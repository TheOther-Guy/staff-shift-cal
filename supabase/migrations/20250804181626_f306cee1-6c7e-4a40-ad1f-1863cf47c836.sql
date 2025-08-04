-- Fix remaining duplicate foreign key relationships

-- Drop old foreign key constraints that are causing ambiguity for stores
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_company_id_fkey;

-- The new foreign keys with proper names should remain:
-- fk_stores_company (stores -> companies)
-- fk_stores_brand (stores -> brands) 
-- fk_stores_location (stores -> locations)