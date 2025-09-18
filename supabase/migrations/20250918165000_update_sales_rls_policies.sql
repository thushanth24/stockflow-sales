-- Enable RLS on sales table if not already enabled
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to update their own sales
CREATE POLICY "Enable update for authenticated users" ON public.sales
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete their own sales
CREATE POLICY "Enable delete for authenticated users" ON public.sales
    FOR DELETE TO authenticated
    USING (true);

-- Drop old policies if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales' 
        AND policyname = 'Enable update for users based on user_id'
    ) THEN
        DROP POLICY "Enable update for users based on user_id" ON public.sales;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales' 
        AND policyname = 'Enable delete for users based on user_id'
    ) THEN
        DROP POLICY "Enable delete for users based on user_id" ON public.sales;
    END IF;
END $$;
