-- Allow editing only the most recent stock update date

-- RLS policy: staff/admin/super_admin can UPDATE stock_updates but only for the latest date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'stock_updates'
      AND policyname = 'Staff can update last stock date only'
  ) THEN
    CREATE POLICY "Staff can update last stock date only"
    ON public.stock_updates
    FOR UPDATE TO authenticated
    USING (
      public.get_user_role(auth.uid()) IN ('staff','admin','super_admin')
      AND update_date = (SELECT MAX(update_date) FROM public.stock_updates)
    )
    WITH CHECK (
      public.get_user_role(auth.uid()) IN ('staff','admin','super_admin')
      AND update_date = (SELECT MAX(update_date) FROM public.stock_updates)
    );
  END IF;
END $$;

-- Trigger should run on INSERT or UPDATE to recalculate sales and sync product stock
DROP TRIGGER IF EXISTS trigger_stock_update_calculate_sales ON public.stock_updates;
CREATE TRIGGER trigger_stock_update_calculate_sales
  AFTER INSERT OR UPDATE ON public.stock_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_sales();

-- Adjust calculate_sales_for_product to replace existing sales entries for a date
CREATE OR REPLACE FUNCTION public.calculate_sales_for_product(
  p_product_id uuid,
  p_update_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Remove any existing sales record for that product/date
  DELETE FROM public.sales WHERE product_id = p_product_id AND sale_date = p_update_date;

  -- Insert sales record if sales quantity > 0
  IF v_sales_qty > 0 THEN
    INSERT INTO public.sales (product_id, quantity, revenue, sale_date)
    VALUES (p_product_id, v_sales_qty, v_sales_qty * v_product_price, p_update_date);
  END IF;
END;
$$;

