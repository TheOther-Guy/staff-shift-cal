-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Add brand_id to stores table
ALTER TABLE public.stores ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- Add brand_id to profiles table
ALTER TABLE public.profiles ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- Create function to get user brand_id
CREATE OR REPLACE FUNCTION public.get_user_brand_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT brand_id FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Create RLS policies for brands table
CREATE POLICY "Admins can manage all brands" 
ON public.brands 
FOR ALL 
USING (get_user_role() = 'admin'::user_role);

CREATE POLICY "Company managers can manage brands in their company" 
ON public.brands 
FOR ALL 
USING (get_user_role() = 'company_manager'::user_role AND company_id = get_user_company_id());

CREATE POLICY "Brand managers can view their brand" 
ON public.brands 
FOR SELECT 
USING (get_user_role() = 'brand_manager'::user_role AND id = get_user_brand_id());

-- Update stores RLS policies to include brand managers
CREATE POLICY "Brand managers can manage stores in their brand" 
ON public.stores 
FOR ALL 
USING (get_user_role() = 'brand_manager'::user_role AND brand_id = get_user_brand_id());

-- Update employees RLS policies to include brand managers
CREATE POLICY "Brand managers can manage employees in their brand stores" 
ON public.employees 
FOR ALL 
USING (get_user_role() = 'brand_manager'::user_role AND store_id IN (
  SELECT stores.id FROM stores WHERE stores.brand_id = get_user_brand_id()
));

-- Update time_off_entries RLS policies to include brand managers
CREATE POLICY "Brand managers can manage time off entries for their brand" 
ON public.time_off_entries 
FOR ALL 
USING (get_user_role() = 'brand_manager'::user_role AND employee_id IN (
  SELECT e.id FROM employees e 
  JOIN stores s ON e.store_id = s.id 
  WHERE s.brand_id = get_user_brand_id()
));

-- Add trigger for brands updated_at
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();