-- Create approval requests table
CREATE TABLE public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('profile_creation', 'time_off', 'sick_leave', 'annual_leave')),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  request_data JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for approval requests
CREATE POLICY "Users can view their own approval requests" 
ON public.approval_requests 
FOR SELECT 
USING (
  auth.uid() = requester_id OR 
  auth.uid() = approver_id OR
  get_user_role() = 'admin'
);

CREATE POLICY "Users can create approval requests" 
ON public.approval_requests 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Approvers and admins can update approval requests" 
ON public.approval_requests 
FOR UPDATE 
USING (
  auth.uid() = approver_id OR 
  get_user_role() = 'admin'
);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_approval_requests_updated_at
BEFORE UPDATE ON public.approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add status to time_off_entries
ALTER TABLE public.time_off_entries 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create function to get approver for time off requests
CREATE OR REPLACE FUNCTION public.get_time_off_approver(employee_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
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
$$;