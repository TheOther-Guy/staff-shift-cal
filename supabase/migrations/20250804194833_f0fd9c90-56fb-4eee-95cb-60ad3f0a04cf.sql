-- Create a junction table for user-brand relationships
CREATE TABLE public.user_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, brand_id)
);

-- Enable RLS
ALTER TABLE public.user_brands ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all user brands" 
ON public.user_brands 
FOR ALL 
USING (get_user_role() = 'admin'::user_role);

CREATE POLICY "Company managers can manage user brands in their company" 
ON public.user_brands 
FOR ALL 
USING (
  get_user_role() = 'company_manager'::user_role 
  AND brand_id IN (
    SELECT id FROM brands WHERE company_id = get_user_company_id()
  )
);

CREATE POLICY "Brand managers can view their assigned brands" 
ON public.user_brands 
FOR SELECT 
USING (
  get_user_role() = 'brand_manager'::user_role 
  AND user_id = auth.uid()
);

-- Update the get_user_brand_id function to return the first brand (for backward compatibility)
CREATE OR REPLACE FUNCTION public.get_user_brand_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT brand_id FROM public.user_brands WHERE user_id = auth.uid() LIMIT 1;
$function$;