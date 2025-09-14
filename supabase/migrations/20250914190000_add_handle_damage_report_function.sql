-- Drop any existing functions with the same name but different signatures
DROP FUNCTION IF EXISTS public.handle_damage_report(JSONB);
DROP FUNCTION IF EXISTS public.handle_damage_report(JSONB[]);

-- Create a function to handle damage reporting with stock update
CREATE OR REPLACE FUNCTION public.handle_damage_report(
  damage_data JSONB
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_damage_array JSONB[];
  damage_record JSONB;
  product_record RECORD;
  i INT;
  v_product_id UUID;
  v_quantity INTEGER;
  v_reason TEXT;
  v_damage_date DATE;
  v_created_by UUID;
  v_updated_stock INTEGER;
  v_error_message TEXT;
  v_error_detail TEXT;
  v_error_hint TEXT;
  v_context TEXT;
  v_result JSONB;
BEGIN
  -- Log the raw input for debugging
  RAISE NOTICE 'Raw input: %', damage_data;
  
  -- Handle different input formats
  IF jsonb_typeof(damage_data) = 'array' THEN
    -- Input is already an array
    RAISE NOTICE 'Processing as direct array input';
    SELECT array_agg(elem) INTO v_damage_array 
    FROM jsonb_array_elements(damage_data) AS elem;
  ELSIF jsonb_typeof(damage_data) = 'object' AND damage_data ? 'damage_data' THEN
    -- Input is an object with damage_data array
    RAISE NOTICE 'Processing as object with damage_data property';
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
    -- Invalid format
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid input format. Expected {damage_data: [...]} or [...]',
      'input_type', jsonb_typeof(damage_data),
      'input_received', damage_data
    );
  END IF;
  
  -- Log the processed array
  RAISE NOTICE 'Processed array: %', v_damage_array;
  
  -- Ensure we have a valid array
  IF v_damage_array IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No damage records found in input',
      'input_received', damage_data
    );
  END IF;
  
  IF array_length(v_damage_array, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Empty damage records array',
      'input_received', damage_data
    );
  END IF;

  -- Start a transaction
  BEGIN
    -- Log the start of the transaction
    RAISE NOTICE 'Starting damage report processing with % records', array_length(v_damage_array, 1);
    
    -- Check if we're in a transaction
    IF (SELECT current_setting('transaction_isolation', true) IS NULL) THEN
      RAISE NOTICE 'No transaction is active, starting one';
    ELSE
      RAISE NOTICE 'Transaction is active: %', current_setting('transaction_isolation', true);
    END IF;
    
    -- Process each damage record
    FOR i IN 1..array_length(v_damage_array, 1)
    LOOP
      damage_record := v_damage_array[i];
      
      -- Log the current record being processed
      RAISE NOTICE 'Processing record % of %: %', i, array_length(v_damage_array, 1), damage_record;
      
      -- Log the raw record type and content
      RAISE NOTICE 'Record type: %', jsonb_typeof(damage_record);
      RAISE NOTICE 'Record content: %', damage_record;
      
      -- Extract and validate required fields with proper type conversion
      BEGIN
        v_product_id := (damage_record->>'product_id')::UUID;
        v_quantity := (damage_record->>'quantity')::INTEGER;
        v_reason := damage_record->>'reason';
        v_damage_date := COALESCE(
          NULLIF((damage_record->>'damage_date')::TEXT, '')::DATE, 
          CURRENT_DATE
        );
        v_created_by := (damage_record->>'created_by')::UUID;
        
        -- Log extracted values
        RAISE NOTICE 'Extracted values - Product: %, Quantity: %, Reason: %, Date: %, Created By: %', 
          v_product_id, v_quantity, v_reason, v_damage_date, v_created_by;
        
        -- Validate required fields
        IF v_product_id IS NULL OR v_quantity IS NULL OR v_reason IS NULL OR v_created_by IS NULL THEN
          RAISE EXCEPTION 'Missing required fields. Required: product_id, quantity, reason, created_by';
        END IF;
        
        IF v_quantity <= 0 THEN
          RAISE EXCEPTION 'Quantity must be a positive number';
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS 
          v_error_message = MESSAGE_TEXT,
          v_error_detail = PG_EXCEPTION_DETAIL,
          v_error_hint = PG_EXCEPTION_HINT,
          v_context = PG_EXCEPTION_CONTEXT;
          
        RETURN jsonb_build_object(
          'success', false,
          'message', 'Invalid data format in damage record',
          'error', v_error_message,
          'detail', v_error_detail,
          'hint', v_error_hint,
          'context', v_context,
          'record_index', i - 1
        );
      END;
      
      -- Get the product with FOR UPDATE to lock the row
      BEGIN
        SELECT * INTO product_record 
        FROM products 
        WHERE id = v_product_id
        FOR UPDATE;
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Product not found';
        END IF;
        
        -- Ensure current_stock is not null by using COALESCE in the UPDATE
        UPDATE products
        SET current_stock = COALESCE(current_stock, 0)
        WHERE id = v_product_id
        RETURNING * INTO product_record;
        
        IF product_record.current_stock IS NULL THEN
          RAISE EXCEPTION 'Failed to initialize stock for product';
        END IF;
        
        -- Check stock
        IF product_record.current_stock < v_quantity THEN
          RAISE EXCEPTION 'Insufficient stock';
        END IF;
        
        -- This block is no longer needed as we handle NULL stock above
        -- The COALESCE in the previous update ensures current_stock is never NULL
        
        -- Calculate new stock level
        v_updated_stock := product_record.current_stock - v_quantity;
        
        -- Ensure we don't go below 0
        IF v_updated_stock < 0 THEN
          RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', 
            product_record.current_stock, v_quantity;
        END IF;
        
        -- Update product stock
        UPDATE products
        SET 
          current_stock = v_updated_stock,
          updated_at = NOW()
        WHERE id = v_product_id
        RETURNING current_stock INTO v_updated_stock;
        
        IF v_updated_stock IS NULL THEN
          RAISE EXCEPTION 'Failed to update stock for product %', v_product_id;
        END IF;
        
        -- Log before insertion
        RAISE NOTICE 'Attempting to insert damage record: product_id=%, quantity=%, reason=%, damage_date=%, created_by=%',
          v_product_id, v_quantity, v_reason, v_damage_date, v_created_by;
          
        -- Insert damage record
        INSERT INTO damages (
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
        )
        RETURNING id INTO v_context;
        
        -- Log successful insertion
        RAISE NOTICE 'Successfully inserted damage record. ID: %', v_context;
        
      EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS 
          v_error_message = MESSAGE_TEXT,
          v_error_detail = PG_EXCEPTION_DETAIL,
          v_error_hint = PG_EXCEPTION_HINT,
          v_context = PG_EXCEPTION_CONTEXT;
          
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
    
    -- If we get here, all operations were successful
    RAISE NOTICE 'Successfully processed all damage records';
    
    -- Commit the transaction
    COMMIT;
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Damage report processed successfully',
      'records_processed', array_length(v_damage_array, 1)
    );
    
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS 
      v_error_message = MESSAGE_TEXT,
      v_error_detail = PG_EXCEPTION_DETAIL,
      v_error_hint = PG_EXCEPTION_HINT,
      v_context = PG_EXCEPTION_CONTEXT;
      
    -- Rollback the transaction on error
    IF (SELECT current_setting('transaction_isolation', true) IS NOT NULL) THEN
      RAISE NOTICE 'Rolling back transaction due to error';
      ROLLBACK;
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unexpected error in handle_damage_report',
      'error', v_error_message,
      'detail', v_error_detail,
      'hint', v_error_hint,
      'context', v_context,
      'record_index', i - 1,
      'current_record', damage_record
    );
  END;
END;
$$;

