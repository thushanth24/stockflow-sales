-- Create a function to insert sales records with proper permissions
CREATE OR REPLACE FUNCTION public.insert_sales_records(
  p_sales_data JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert sales records
  INSERT INTO public.sales (
    product_id,
    quantity,
    revenue,
    sale_date
  )
  SELECT
    (item->>'product_id')::uuid,
    (item->>'quantity')::integer,
    (item->>'revenue')::decimal(10,2),
    (item->>'sale_date')::date
  FROM jsonb_array_elements(p_sales_data) AS item;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_sales_records(JSONB) TO authenticated;

-- Create a policy to allow authenticated users to call this function
CREATE POLICY "Allow authenticated users to call insert_sales_records"
  ON public.sales
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
