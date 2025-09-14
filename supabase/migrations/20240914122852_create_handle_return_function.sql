-- Create a function to handle returns
CREATE OR REPLACE FUNCTION public.handle_return(
  p_product_id UUID,
  p_quantity INTEGER,
  p_reason TEXT,
  p_created_by UUID
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Insert the return record
  INSERT INTO public.returns (
    product_id,
    quantity,
    reason,
    created_by
  ) VALUES (
    p_product_id,
    p_quantity,
    p_reason,
    p_created_by
  ) RETURNING to_jsonb(public.returns.*) INTO result;
  
  -- Update the product stock
  UPDATE public.products 
  SET current_stock = current_stock + p_quantity,
      updated_at = now()
  WHERE id = p_product_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'data', result
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_return(UUID, INTEGER, TEXT, UUID) TO authenticated;
