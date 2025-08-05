-- Create a temporary function to reset admin password
CREATE OR REPLACE FUNCTION public.reset_admin_password_temp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get the admin user id
    SELECT user_id INTO admin_user_id 
    FROM public.profiles 
    WHERE email = 'kareem722@gmail.com' AND role = 'admin';
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Admin user not found';
    END IF;
    
    -- Note: Password reset must be done via Supabase admin API
    -- This function just confirms the admin user exists
    RAISE NOTICE 'Admin user found with ID: %', admin_user_id;
END;
$$;