-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "All authenticated users can view categories" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Staff and above can insert categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['staff'::user_role, 'admin'::user_role, 'super_admin'::user_role]));

CREATE POLICY "Staff and above can update categories" 
ON public.categories 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['staff'::user_role, 'admin'::user_role, 'super_admin'::user_role]));

-- Add category_id to products table
ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Create trigger for categories updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();