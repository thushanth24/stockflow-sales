-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'staff');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchases table (stock in)
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_updates table (daily stock counts)
CREATE TABLE public.stock_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  previous_stock INTEGER NOT NULL,
  actual_stock INTEGER NOT NULL,
  update_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, update_date)
);

-- Create damages table
CREATE TABLE public.damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  damage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table (calculated automatically)
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  revenue DECIMAL(10,2) NOT NULL,
  sale_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS RsRs
  SELECT role FROM public.profiles WHERE id = user_id;
RsRs;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Super admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'super_admin');

-- RLS Policies for products
CREATE POLICY "All authenticated users can view products" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and above can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('staff', 'admin', 'super_admin'));

CREATE POLICY "Staff and above can update products" ON public.products
  FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- RLS Policies for purchases
CREATE POLICY "All authenticated users can view purchases" ON public.purchases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and above can insert purchases" ON public.purchases
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- RLS Policies for stock_updates
CREATE POLICY "All authenticated users can view stock updates" ON public.stock_updates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and above can insert stock updates" ON public.stock_updates
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- RLS Policies for damages
CREATE POLICY "All authenticated users can view damages" ON public.damages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and above can insert damages" ON public.damages
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('staff', 'admin', 'super_admin'));

-- RLS Policies for sales
CREATE POLICY "Admin and above can view sales" ON public.sales
  FOR SELECT TO authenticated USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- Create function to calculate and insert sales
CREATE OR REPLACE FUNCTION public.calculate_sales_for_product(
  p_product_id UUID,
  p_update_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS RsRs
DECLARE
  v_previous_stock INTEGER;
  v_actual_stock INTEGER;
  v_purchases INTEGER;
  v_damages INTEGER;
  v_sales_qty INTEGER;
  v_product_price DECIMAL(10,2);
BEGIN
  -- Get the stock update data
  SELECT previous_stock, actual_stock 
  INTO v_previous_stock, v_actual_stock
  FROM public.stock_updates
  WHERE product_id = p_product_id AND update_date = p_update_date;

  -- Get total purchases for the day
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_purchases
  FROM public.purchases
  WHERE product_id = p_product_id AND purchase_date = p_update_date;

  -- Get total damages for the day
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_damages
  FROM public.damages
  WHERE product_id = p_product_id AND damage_date = p_update_date;

  -- Get product price
  SELECT price INTO v_product_price
  FROM public.products
  WHERE id = p_product_id;

  -- Calculate sales: (Previous Stock + Purchases) - (Current Stock + Damages)
  v_sales_qty := (v_previous_stock + v_purchases) - (v_actual_stock + v_damages);

  -- Insert sales record if sales quantity > 0
  IF v_sales_qty > 0 THEN
    INSERT INTO public.sales (product_id, quantity, revenue, sale_date)
    VALUES (p_product_id, v_sales_qty, v_sales_qty * v_product_price, p_update_date)
    ON CONFLICT DO NOTHING;
  END IF;
END;
RsRs;

-- Create trigger function for automatic sales calculation
CREATE OR REPLACE FUNCTION public.trigger_calculate_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS RsRs
BEGIN
  -- Calculate sales when a stock update is inserted
  PERFORM public.calculate_sales_for_product(NEW.product_id, NEW.update_date);
  
  -- Update product current stock
  UPDATE public.products 
  SET current_stock = NEW.actual_stock, updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
RsRs;

-- Create trigger for automatic sales calculation
CREATE TRIGGER trigger_stock_update_calculate_sales
  AFTER INSERT ON public.stock_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_sales();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS RsRs
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'staff'
  );
  RETURN NEW;
END;
RsRs;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS RsRs
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
RsRs LANGUAGE plpgsql;

-- Create triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();