-- Remove location_id from brands table since brands can exist in multiple locations
ALTER TABLE public.brands DROP COLUMN IF EXISTS location_id;

-- Create junction table for brand-location many-to-many relationship
CREATE TABLE IF NOT EXISTS public.brand_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, location_id)
);

-- Enable RLS on brand_locations
ALTER TABLE public.brand_locations ENABLE ROW LEVEL SECURITY;

-- Update stores table to require both brand_id and location_id
ALTER TABLE public.stores 
  ALTER COLUMN brand_id SET NOT NULL,
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);

-- Add constraint to ensure store's brand exists in that location
ALTER TABLE public.stores 
  ADD CONSTRAINT stores_brand_location_check 
  CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_locations bl 
      WHERE bl.brand_id = stores.brand_id 
      AND bl.location_id = stores.location_id
    )
  );

-- Update employees table to remove brand_id since it's determined by store
ALTER TABLE public.employees DROP COLUMN IF EXISTS brand_id;

-- RLS policies for brand_locations
CREATE POLICY "Admins can manage all brand locations" 
ON public.brand_locations 
FOR ALL 
USING (get_user_role() = 'admin'::user_role);

CREATE POLICY "Company managers can manage brand locations in their company" 
ON public.brand_locations 
FOR ALL 
USING (
  get_user_role() = 'company_manager'::user_role 
  AND brand_id IN (
    SELECT id FROM public.brands WHERE company_id = get_user_company_id()
  )
);

CREATE POLICY "Location managers can manage brand locations in their location" 
ON public.brand_locations 
FOR ALL 
USING (
  get_user_role() = 'location_manager'::user_role 
  AND location_id = get_user_location_id()
);

CREATE POLICY "Brand managers can view their brand locations" 
ON public.brand_locations 
FOR SELECT 
USING (
  get_user_role() = 'brand_manager'::user_role 
  AND brand_id = get_user_brand_id()
);

-- Update existing RLS policies for brands (remove location-based policies)
DROP POLICY IF EXISTS "Location managers can manage brands in their location" ON public.brands;
DROP POLICY IF EXISTS "Brand managers can view their brand" ON public.brands;

CREATE POLICY "Brand managers can view their brand" 
ON public.brands 
FOR SELECT 
USING (
  get_user_role() = 'brand_manager'::user_role 
  AND id = get_user_brand_id()
);

-- Update stores RLS policies to handle new location requirement
DROP POLICY IF EXISTS "Location managers can manage stores in their location brands" ON public.stores;

CREATE POLICY "Location managers can manage stores in their location" 
ON public.stores 
FOR ALL 
USING (
  get_user_role() = 'location_manager'::user_role 
  AND location_id = get_user_location_id()
);

-- Update employees RLS to remove brand-based access
DROP POLICY IF EXISTS "Brand managers can manage employees in their brand stores" ON public.employees;

CREATE POLICY "Brand managers can manage employees in their brand stores" 
ON public.employees 
FOR ALL 
USING (
  get_user_role() = 'brand_manager'::user_role 
  AND store_id IN (
    SELECT s.id FROM public.stores s
    JOIN public.brand_locations bl ON s.brand_id = bl.brand_id AND s.location_id = bl.location_id
    WHERE bl.brand_id = get_user_brand_id()
  )
);

-- Update time_off_entries RLS for brand managers
DROP POLICY IF EXISTS "Brand managers can manage time off entries for their brand" ON public.time_off_entries;

CREATE POLICY "Brand managers can manage time off entries for their brand" 
ON public.time_off_entries 
FOR ALL 
USING (
  get_user_role() = 'brand_manager'::user_role 
  AND employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.stores s ON e.store_id = s.id
    JOIN public.brand_locations bl ON s.brand_id = bl.brand_id AND s.location_id = bl.location_id
    WHERE bl.brand_id = get_user_brand_id()
  )
);

-- Add trigger for updated_at on brand_locations
CREATE TRIGGER update_brand_locations_updated_at
  BEFORE UPDATE ON public.brand_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();