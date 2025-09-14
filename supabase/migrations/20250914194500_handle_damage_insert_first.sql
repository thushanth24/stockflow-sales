-- Prioritize persisting damages; try stock update best-effort after
-- Replaces handle_damage_report to insert into damages first, then attempt stock update

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
  v_damage_id UUID;
  v_stock_status TEXT;
  v_stock_error_msg TEXT;
  v_results JSONB := '[]'::jsonb;
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
    v_stock_status := NULL; v_stock_error_msg := NULL; v_damage_id := NULL;
    BEGIN
      -- Extract and validate minimal required fields for damage insert
      v_product_id := (damage_record->>'product_id')::UUID;
      v_quantity   := (damage_record->>'quantity')::INTEGER;
      v_reason     := damage_record->>'reason';
      v_damage_date := COALESCE(NULLIF((damage_record->>'damage_date')::TEXT, '')::DATE, CURRENT_DATE);
      v_created_by := NULLIF(damage_record->>'created_by','')::UUID;

      IF v_product_id IS NULL OR v_quantity IS NULL OR v_reason IS NULL THEN
        RAISE EXCEPTION 'Missing required fields. Required: product_id, quantity, reason';
      END IF;
      IF v_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be a positive number';
      END IF;

      -- Insert damage first; let RLS/constraints validate product existence
      INSERT INTO public.damages (
        product_id, quantity, reason, damage_date, created_by
      ) VALUES (
        v_product_id, v_quantity, v_reason, v_damage_date, v_created_by
      ) RETURNING id INTO v_damage_id;

      -- Best-effort stock update; do not fail the whole operation
      BEGIN
        UPDATE public.products
        SET current_stock = GREATEST(COALESCE(current_stock, 0) - v_quantity, 0),
            updated_at    = now()
        WHERE id = v_product_id;
        v_stock_status := 'updated';
      EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_stock_error_msg = MESSAGE_TEXT;
        v_stock_status := 'failed';
      END;

      -- Append per-record result
      v_results := v_results || jsonb_build_object(
        'product_id', v_product_id,
        'damage_id', v_damage_id,
        'stock_update', v_stock_status,
        'stock_error', COALESCE(v_stock_error_msg, '')
      );

    EXCEPTION WHEN OTHERS THEN
      -- Append error for this record and continue
      v_results := v_results || jsonb_build_object(
        'product_id', COALESCE(v_product_id, '00000000-0000-0000-0000-000000000000'::uuid),
        'error', SQLERRM,
        'record_index', i - 1
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Damage report processed',
    'results', v_results
  );
END;
$$;

