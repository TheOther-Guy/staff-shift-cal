-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'mall', -- 'mall' or 'hq'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Add location_id to brands table
ALTER TABLE public.brands ADD COLUMN location_id UUID;

-- Add location_id and hiring_date to employees table, update structure
ALTER TABLE public.employees ADD COLUMN company_id UUID;
ALTER TABLE public.employees ADD COLUMN brand_id UUID;
ALTER TABLE public.employees ADD COLUMN location_id UUID;
ALTER TABLE public.employees ADD COLUMN hiring_date DATE DEFAULT CURRENT_DATE;

-- Add location_id to profiles table for location managers
ALTER TABLE public.profiles ADD COLUMN location_id UUID;

-- Add location_manager role to user_role enum
ALTER TYPE user_role ADD VALUE 'location_manager';

-- Create function to get user location id
CREATE OR REPLACE FUNCTION public.get_user_location_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT location_id FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Create RLS policies for locations
CREATE POLICY "Admins can manage all locations" 
ON public.locations 
FOR ALL 
USING (get_user_role() = 'admin'::user_role);

CREATE POLICY "Company managers can manage locations in their company" 
ON public.locations 
FOR ALL 
USING (get_user_role() = 'company_manager'::user_role AND company_id = get_user_company_id());

CREATE POLICY "Location managers can view their location" 
ON public.locations 
FOR SELECT 
USING (get_user_role() = 'location_manager'::user_role AND id = get_user_location_id());

-- Update existing brand policies to include location managers
DROP POLICY "Brand managers can view their brand" ON public.brands;
CREATE POLICY "Brand managers can view their brand" 
ON public.brands 
FOR SELECT 
USING (get_user_role() = 'brand_manager'::user_role AND id = get_user_brand_id());

CREATE POLICY "Location managers can manage brands in their location" 
ON public.brands 
FOR ALL 
USING (get_user_role() = 'location_manager'::user_role AND location_id = get_user_location_id());

-- Update stores policies to include location hierarchy
CREATE POLICY "Location managers can manage stores in their location brands" 
ON public.stores 
FOR ALL 
USING (get_user_role() = 'location_manager'::user_role AND brand_id IN (
  SELECT id FROM public.brands WHERE location_id = get_user_location_id()
));

-- Update employees policies to include location hierarchy
CREATE POLICY "Location managers can manage employees in their location" 
ON public.employees 
FOR ALL 
USING (get_user_role() = 'location_manager'::user_role AND location_id = get_user_location_id());

-- Update trigger for locations
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();