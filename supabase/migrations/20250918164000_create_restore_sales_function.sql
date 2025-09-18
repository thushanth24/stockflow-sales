-- Function to handle sales restoration
CREATE OR REPLACE FUNCTION public.handle_sales_restoration(
  p_sale_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_user_id UUID
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale RECORD;
  v_restored_quantity INTEGER;
  v_original_quantity INTEGER;
  v_result JSONB;
  v_new_quantity INTEGER;
BEGIN
  -- Get the sale record
  SELECT * INTO v_sale 
  FROM sales 
  WHERE id = p_sale_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sale not found');
  END IF;
  
  -- Calculate how much can be restored (can't restore more than was sold)
  v_restored_quantity := LEAST(p_quantity, v_sale.quantity);
  v_original_quantity := v_sale.quantity;
  
  -- Update product stock
  UPDATE products 
  SET current_stock = current_stock + v_restored_quantity
  WHERE id = p_product_id
  RETURNING current_stock INTO v_new_quantity;
  
  -- Record the restoration first to maintain referential integrity
  INSERT INTO sales_restorations (
    sale_id,
    product_id,
    quantity_restored,
    restored_by,
    original_quantity,
    sale_date
  ) VALUES (
    p_sale_id,
    p_product_id,
    v_restored_quantity,
    p_user_id,
    v_original_quantity,
    v_sale.sale_date
  );
  
  -- Now update or delete the sale record
  IF v_restored_quantity = v_sale.quantity THEN
    -- If restoring all, delete the sale record
    -- First, delete any other restorations to avoid FK constraint
    DELETE FROM sales_restorations WHERE sale_id = p_sale_id;
    -- Then delete the sale
    DELETE FROM sales WHERE id = p_sale_id;
  ELSE
    -- If partial restore, reduce the quantity
    UPDATE sales 
    SET quantity = quantity - v_restored_quantity
    WHERE id = p_sale_id;
  END IF;
  
  -- Moved to before the sale update/delete to maintain referential integrity
  RETURN jsonb_build_object(
    'success', true,
    'restored_quantity', v_restored_quantity,
    'new_stock', v_new_quantity,
    'sale_updated', v_restored_quantity < v_original_quantity,
    'sale_deleted', v_restored_quantity = v_original_quantity
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;



-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_sales_restoration(UUID, UUID, INTEGER, UUID) TO authenticated;

-- Create or replace the sales view to account for restored sales
CREATE OR REPLACE VIEW public.sales_report_view AS
SELECT 
  s.id,
  s.product_id,
  p.name as product_name,
  p.sku,
  s.quantity - COALESCE(SUM(sr.quantity_restored), 0) as quantity,
  p.price,
  (s.quantity - COALESCE(SUM(sr.quantity_restored), 0)) * p.price as total,
  s.sale_date,
  s.created_at
FROM 
  sales s
  JOIN products p ON s.product_id = p.id
  LEFT JOIN sales_restorations sr ON s.id = sr.sale_id
GROUP BY 
  s.id, p.id, p.price, p.name, p.sku, s.quantity, s.sale_date, s.created_at
HAVING 
  s.quantity - COALESCE(SUM(sr.quantity_restored), 0) > 0;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.sales_report_view TO authenticated;


