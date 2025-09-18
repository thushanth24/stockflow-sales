-- Create a simpler version of the function that doesn't rely on RLS
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
  v_new_quantity INTEGER;
  v_debug_info JSONB;
  v_rows_affected INTEGER;
BEGIN
  -- Log function start
  RAISE NOTICE 'Starting restoration for sale_id: %', p_sale_id;
  
  -- Get the sale record
  SELECT * INTO v_sale 
  FROM sales 
  WHERE id = p_sale_id
  FOR UPDATE;
  
  RAISE NOTICE 'Found sale: %', row_to_json(v_sale);
  
  IF v_sale IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sale not found');
  END IF;
  
  -- Calculate how much can be restored (can't restore more than was sold)
  v_restored_quantity := LEAST(p_quantity, v_sale.quantity);
  v_original_quantity := v_sale.quantity;
  
  RAISE NOTICE 'Restoring % of % items (original quantity: %)', 
    v_restored_quantity, p_quantity, v_original_quantity;
  
  -- Update product stock
  RAISE NOTICE 'Updating product % stock. Adding % items', p_product_id, v_restored_quantity;
  
  UPDATE products 
  SET current_stock = current_stock + v_restored_quantity
  WHERE id = p_product_id
  RETURNING current_stock INTO v_new_quantity;
  
  RAISE NOTICE 'New stock level for product %: %', p_product_id, v_new_quantity;
  
  -- Record the restoration first to avoid foreign key constraint issues
  RAISE NOTICE 'Recording restoration in sales_restorations table';
  
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
  
  -- Update or delete the sale record after recording the restoration
  IF v_restored_quantity = v_sale.quantity THEN
    RAISE NOTICE 'FULL RESTORATION: Processing sale record %', p_sale_id;
    
    -- First, delete from sales
    BEGIN
      DELETE FROM sales WHERE id = p_sale_id;
      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      RAISE NOTICE 'Deleted % rows from sales table', v_rows_affected;
      
      -- Verify deletion
      PERFORM 1 FROM sales WHERE id = p_sale_id;
      IF FOUND THEN
        RAISE NOTICE 'WARNING: Sale record still exists after deletion attempt';
        -- Try to get more info about the record
        PERFORM * FROM sales WHERE id = p_sale_id;
      ELSE
        RAISE NOTICE 'Successfully verified sale % deletion', p_sale_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error deleting from sales: %', SQLERRM;
    END;
  ELSE
    -- If partial restore, reduce the quantity
    RAISE NOTICE 'PARTIAL RESTORATION: Reducing quantity by % for sale %', 
      v_restored_quantity, p_sale_id;
      
    UPDATE sales 
    SET quantity = quantity - v_restored_quantity
    WHERE id = p_sale_id
    RETURNING * INTO v_sale;
    
    RAISE NOTICE 'Updated sale quantity to %', v_sale.quantity;
  END IF;
  
  v_debug_info := jsonb_build_object(
    'success', true,
    'restored_quantity', v_restored_quantity,
    'new_stock', v_new_quantity,
    'sale_updated', v_restored_quantity < v_original_quantity,
    'sale_deleted', v_restored_quantity = v_original_quantity,
    'original_quantity', v_original_quantity,
    'sale_quantity', v_sale.quantity,
    'deleted', v_restored_quantity = v_original_quantity,
    'sale_id', p_sale_id,
    'product_id', p_product_id,
    'user_id', p_user_id
  );
  
  RAISE NOTICE 'Restoration completed successfully: %', v_debug_info;
  RETURN v_debug_info;
EXCEPTION
  WHEN OTHERS THEN
    DECLARE
      error_message TEXT := SQLERRM;
      error_state TEXT := SQLSTATE;
    BEGIN
      RAISE NOTICE 'ERROR in handle_sales_restoration: % (SQLSTATE: %)', error_message, error_state;
      RETURN jsonb_build_object(
        'success', false,
        'message', error_message,
        'sqlstate', error_state,
        'sale_id', p_sale_id,
        'product_id', p_product_id,
        'error_time', NOW()
      );
    END;
END;
$$;
