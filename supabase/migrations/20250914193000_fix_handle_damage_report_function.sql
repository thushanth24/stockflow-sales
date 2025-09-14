-- Fix handle_damage_report to avoid NULL current_stock and illegal transaction statements
-- Replaces the prior implementation with safer stock math and proper search_path

DROP FUNCTION IF EXISTS public.handle_damage_report(JSONB);

CREATE OR REPLACE FUNCTION public.handle_damage_report(
  damage_data JSONB
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_damage_array JSONB[];
  damage_record JSONB;
  i INT;
  v_product_id UUID;
  v_quantity INTEGER;
  v_reason TEXT;
  v_damage_date DATE;
  v_created_by UUID;
  v_prev_stock INTEGER;
  v_updated_stock INTEGER;
  v_error_message TEXT;
  v_error_detail TEXT;
  v_error_hint TEXT;
  v_context TEXT;
BEGIN
  -- Normalize input into an array of JSONB objects
  IF jsonb_typeof(damage_data) = 'array' THEN
    SELECT array_agg(elem) INTO v_damage_array 
    FROM jsonb_array_elements(damage_data) AS elem;
  ELSIF jsonb_typeof(damage_data) = 'object' AND damage_data ? 'damage_data' THEN
    IF jsonb_typeof(damage_data->'damage_data') = 'array' THEN
      SELECT array_agg(elem) INTO v_damage_array 
      FROM jsonb_array_elements(damage_data->'damage_data') AS elem;
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'message', 'damage_data is not an array',
        'damage_data_type', jsonb_typeof(damage_data->'damage_data'),
        'input_received', damage_data
      );
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid input format. Expected {damage_data: [...]} or [...]',
      'input_type', jsonb_typeof(damage_data),
      'input_received', damage_data
    );
  END IF;

  IF v_damage_array IS NULL OR array_length(v_damage_array, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No damage records found in input',
      'input_received', damage_data
    );
  END IF;

  FOR i IN 1..array_length(v_damage_array, 1) LOOP
    damage_record := v_damage_array[i];
    BEGIN
      -- Extract values
      v_product_id := (damage_record->>'product_id')::UUID;
      v_quantity   := (damage_record->>'quantity')::INTEGER;
      v_reason     := damage_record->>'reason';
      v_damage_date := COALESCE(NULLIF((damage_record->>'damage_date')::TEXT, '')::DATE, CURRENT_DATE);
      v_created_by := (damage_record->>'created_by')::UUID;

      -- Validate
      IF v_product_id IS NULL OR v_quantity IS NULL OR v_reason IS NULL OR v_created_by IS NULL THEN
        RAISE EXCEPTION 'Missing required fields. Required: product_id, quantity, reason, created_by';
      END IF;
      IF v_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be a positive number';
      END IF;

      -- Lock the product row and read current stock
      SELECT current_stock INTO v_prev_stock
      FROM public.products
      WHERE id = v_product_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
      END IF;

      v_prev_stock := COALESCE(v_prev_stock, 0);
      IF v_prev_stock < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_prev_stock, v_quantity;
      END IF;

      -- Atomically reduce stock; never set NULL; never go below 0
      UPDATE public.products
      SET current_stock = GREATEST(COALESCE(current_stock, 0) - v_quantity, 0),
          updated_at    = now()
      WHERE id = v_product_id
      RETURNING current_stock INTO v_updated_stock;

      IF v_updated_stock IS NULL THEN
        RAISE EXCEPTION 'Failed to update stock for product %', v_product_id;
      END IF;

      -- Record the damage
      INSERT INTO public.damages (
        product_id,
        quantity,
        reason,
        damage_date,
        created_by
      ) VALUES (
        v_product_id,
        v_quantity,
        v_reason,
        v_damage_date,
        v_created_by
      );

    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS 
        v_error_message = MESSAGE_TEXT,
        v_error_detail  = PG_EXCEPTION_DETAIL,
        v_error_hint    = PG_EXCEPTION_HINT,
        v_context       = PG_EXCEPTION_CONTEXT;

      RETURN jsonb_build_object(
        'success', false,
        'message', 'Error processing damage record',
        'product_id', v_product_id,
        'error', v_error_message,
        'detail', v_error_detail,
        'hint', v_error_hint,
        'context', v_context,
        'record_index', i - 1
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Damage report processed successfully',
    'records_processed', array_length(v_damage_array, 1)
  );
END;
$$;

