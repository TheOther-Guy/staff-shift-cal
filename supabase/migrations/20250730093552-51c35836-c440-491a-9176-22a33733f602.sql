-- Add foreign key constraints
ALTER TABLE public.locations 
ADD CONSTRAINT fk_locations_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.brands 
ADD CONSTRAINT fk_brands_location 
FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

ALTER TABLE public.brands 
ADD CONSTRAINT fk_brands_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.stores 
ADD CONSTRAINT fk_stores_brand 
FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;

ALTER TABLE public.stores 
ADD CONSTRAINT fk_stores_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.employees 
ADD CONSTRAINT fk_employees_store 
FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE public.employees 
ADD CONSTRAINT fk_employees_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.employees 
ADD CONSTRAINT fk_employees_brand 
FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;

ALTER TABLE public.employees 
ADD CONSTRAINT fk_employees_location 
FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;