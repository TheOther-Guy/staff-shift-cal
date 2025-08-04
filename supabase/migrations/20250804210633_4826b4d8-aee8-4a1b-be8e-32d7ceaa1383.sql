-- Update the check constraint on time_off_entries table to include new types
ALTER TABLE time_off_entries DROP CONSTRAINT IF EXISTS time_off_entries_type_check;
ALTER TABLE time_off_entries ADD CONSTRAINT time_off_entries_type_check 
CHECK (type IN ('sick-leave', 'day-off', 'weekend', 'available', 'annual', 'travel', 'mission'));