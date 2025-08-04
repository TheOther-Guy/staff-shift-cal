-- Add missing foreign key constraint between user_brands and brands tables
ALTER TABLE public.user_brands 
ADD CONSTRAINT fk_user_brands_brand 
FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;

-- Add missing foreign key constraint between user_brands and auth.users
-- Note: We use user_id column to reference auth.users table indirectly
-- The constraint will be handled by the application logic