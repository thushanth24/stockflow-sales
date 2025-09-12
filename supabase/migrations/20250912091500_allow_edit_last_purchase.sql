-- Allow editing only the most recent purchase date and recalc sales safely

-- RLS policy: staff/admin/super_admin can UPDATE purchases but only for the latest date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'purchases'
      AND policyname = 'Staff can update last purchase date only'
  ) THEN
    CREATE POLICY "Staff can update last purchase date only"
    ON public.purchases
    FOR UPDATE TO authenticated
    USING (
      public.get_user_role(auth.uid()) IN ('staff','admin','super_admin')
      AND purchase_date = (SELECT MAX(purchase_date) FROM public.purchases)
    )
    WITH CHECK (
      public.get_user_role(auth.uid()) IN ('staff','admin','super_admin')
      AND purchase_date = (SELECT MAX(purchase_date) FROM public.purchases)
    );
  END IF;
END $$;

-- Safe trigger function: recalculate sales only if a stock update exists for that product/date
CREATE OR REPLACE FUNCTION public.trigger_recalculate_sales_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only recalc if there is a stock update row for this product and date
  IF EXISTS (
    SELECT 1 FROM public.stock_updates 
    WHERE product_id = NEW.product_id AND update_date = NEW.purchase_date
  ) THEN
    PERFORM public.calculate_sales_for_product(NEW.product_id, NEW.purchase_date);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on purchases for INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_recalculate_sales_on_purchase ON public.purchases;
CREATE TRIGGER trigger_recalculate_sales_on_purchase
  AFTER INSERT OR UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalculate_sales_on_purchase();

