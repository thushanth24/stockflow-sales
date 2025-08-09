-- Fix function search paths for security
-- Phase 2: Database Function Security

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = user_id;
$function$;

-- Fix handle_new_user function  
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix calculate_sales_for_product function
CREATE OR REPLACE FUNCTION public.calculate_sales_for_product(p_product_id uuid, p_update_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix trigger_calculate_sales function
CREATE OR REPLACE FUNCTION public.trigger_calculate_sales()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Calculate sales when a stock update is inserted
  PERFORM public.calculate_sales_for_product(NEW.product_id, NEW.update_date);
  
  -- Update product current stock
  UPDATE public.products 
  SET current_stock = NEW.actual_stock, updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Phase 1: Enhanced RLS policies for role security
-- Add policy to prevent users from escalating their own role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Users cannot update their own role'
  ) THEN
    CREATE POLICY "Users cannot update their own role"
    ON public.profiles
    FOR UPDATE
    USING (
      auth.uid() != id OR 
      (auth.uid() = id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'))
    );
  END IF;
END $$;

-- Add audit logging table for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  old_role user_role,
  new_role user_role,
  changed_by uuid REFERENCES public.profiles(id),
  changed_at timestamp with time zone DEFAULT now(),
  reason text
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins and super_admins can view audit logs
CREATE POLICY "Admins can view role audit logs"
ON public.role_change_audit
FOR SELECT
USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- Function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only log if role actually changed
  IF OLD.role != NEW.role THEN
    INSERT INTO public.role_change_audit (user_id, old_role, new_role, changed_by)
    VALUES (NEW.id, OLD.role, NEW.role, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for role change logging
DROP TRIGGER IF EXISTS role_change_audit_trigger ON public.profiles;
CREATE TRIGGER role_change_audit_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();