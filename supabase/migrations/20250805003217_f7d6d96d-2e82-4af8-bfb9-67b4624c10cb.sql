-- Create a function to auto-populate profile fields for brand managers
CREATE OR REPLACE FUNCTION public.auto_populate_brand_manager_profile()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate brand manager profiles on insert/update
CREATE TRIGGER auto_populate_brand_manager_profile_trigger
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_populate_brand_manager_profile();