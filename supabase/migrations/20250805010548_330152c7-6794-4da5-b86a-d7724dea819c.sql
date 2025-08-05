-- Fix critical role escalation vulnerability
-- Drop the overly permissive policy that allows users to update their role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a more secure policy that excludes role changes
CREATE POLICY "Users can update their own profile data" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- Create admin-only policy for role changes
CREATE POLICY "Admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (get_user_role() = 'admin'::user_role);

-- Secure all database functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_user_brand_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT brand_id FROM public.user_brands WHERE user_id = auth.uid() LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'store_manager' -- Default role, can be changed by admin later
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_time_off_approver(employee_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT p.user_id 
  FROM public.profiles p
  JOIN public.employees e ON e.store_id = ANY(
    SELECT s.id FROM public.stores s 
    JOIN public.user_brands ub ON s.brand_id = ub.brand_id 
    WHERE ub.user_id = p.user_id
  )
  WHERE p.role = 'brand_manager' 
  AND e.id = employee_id
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.auto_populate_brand_manager_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    user_brand_record RECORD;
BEGIN
    -- Only process if this is a brand_manager and fields are not already set
    IF NEW.role = 'brand_manager' AND (NEW.company_id IS NULL OR NEW.brand_id IS NULL) THEN
        -- Get the first brand assignment for this user
        SELECT ub.brand_id, b.company_id 
        INTO user_brand_record
        FROM public.user_brands ub
        JOIN public.brands b ON ub.brand_id = b.id
        WHERE ub.user_id = NEW.user_id
        LIMIT 1;
        
        -- If we found a brand assignment, update the profile
        IF user_brand_record IS NOT NULL THEN
            NEW.company_id = user_brand_record.company_id;
            NEW.brand_id = user_brand_record.brand_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT store_id FROM public.profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;