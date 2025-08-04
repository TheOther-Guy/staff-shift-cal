-- Update the user's profile to assign them to a company and store
UPDATE profiles 
SET 
  company_id = 'a785eef4-2513-43c1-9c16-8497d770dabf', -- FIG company
  store_id = '52fcbd60-25b3-4d62-8dc8-af1a0d380c93' -- Women Secret CS store
WHERE user_id = 'b55cea6c-4667-4826-9c0e-260843bb43fa';