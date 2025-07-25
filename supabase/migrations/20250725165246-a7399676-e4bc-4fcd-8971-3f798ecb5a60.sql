-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'company_manager', 'store_manager');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'store_manager',
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_off_entries table
CREATE TABLE public.time_off_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sick-leave', 'day-off', 'weekend', 'available')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_entries ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create security definer function to get user company
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create security definer function to get user store
CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS UUID AS $$
  SELECT store_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for companies
CREATE POLICY "Admins can manage all companies" ON public.companies
FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Company managers can view their company" ON public.companies
FOR SELECT USING (public.get_user_role() = 'company_manager' AND id = public.get_user_company_id());

CREATE POLICY "Store managers can view their company" ON public.companies
FOR SELECT USING (public.get_user_role() = 'store_manager' AND id = public.get_user_company_id());

-- RLS Policies for stores
CREATE POLICY "Admins can manage all stores" ON public.stores
FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Company managers can manage stores in their company" ON public.stores
FOR ALL USING (public.get_user_role() = 'company_manager' AND company_id = public.get_user_company_id());

CREATE POLICY "Store managers can view their store" ON public.stores
FOR SELECT USING (public.get_user_role() = 'store_manager' AND id = public.get_user_store_id());

-- RLS Policies for profiles
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Company managers can manage profiles in their company" ON public.profiles
FOR ALL USING (public.get_user_role() = 'company_manager' AND company_id = public.get_user_company_id());

CREATE POLICY "Store managers can view profiles in their company" ON public.profiles
FOR SELECT USING (public.get_user_role() = 'store_manager' AND company_id = public.get_user_company_id());

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for employees
CREATE POLICY "Admins can manage all employees" ON public.employees
FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Company managers can manage employees in their company stores" ON public.employees
FOR ALL USING (
  public.get_user_role() = 'company_manager' AND 
  store_id IN (SELECT id FROM public.stores WHERE company_id = public.get_user_company_id())
);

CREATE POLICY "Store managers can manage employees in their store" ON public.employees
FOR ALL USING (public.get_user_role() = 'store_manager' AND store_id = public.get_user_store_id());

-- RLS Policies for time_off_entries
CREATE POLICY "Admins can manage all time off entries" ON public.time_off_entries
FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Company managers can manage time off entries for their company" ON public.time_off_entries
FOR ALL USING (
  public.get_user_role() = 'company_manager' AND 
  employee_id IN (
    SELECT e.id FROM public.employees e
    JOIN public.stores s ON e.store_id = s.id
    WHERE s.company_id = public.get_user_company_id()
  )
);

CREATE POLICY "Store managers can manage time off entries for their store" ON public.time_off_entries
FOR ALL USING (
  public.get_user_role() = 'store_manager' AND 
  employee_id IN (SELECT id FROM public.employees WHERE store_id = public.get_user_store_id())
);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_off_entries_updated_at
  BEFORE UPDATE ON public.time_off_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.companies (name) VALUES 
  ('Tech Corp'),
  ('Retail Solutions');

INSERT INTO public.stores (company_id, name) VALUES 
  ((SELECT id FROM public.companies WHERE name = 'Tech Corp'), 'Tech Corp - Downtown'),
  ((SELECT id FROM public.companies WHERE name = 'Tech Corp'), 'Tech Corp - Mall'),
  ((SELECT id FROM public.companies WHERE name = 'Retail Solutions'), 'Retail Solutions - Main St'),
  ((SELECT id FROM public.companies WHERE name = 'Retail Solutions'), 'Retail Solutions - Plaza');