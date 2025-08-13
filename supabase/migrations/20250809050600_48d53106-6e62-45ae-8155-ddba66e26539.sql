-- Enable RLS on archive table and lock it down by default
ALTER TABLE public.stock_updates_archive ENABLE ROW LEVEL SECURITY;

-- Optional: allow only super_admins to view archive data
DO RsRs
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'stock_updates_archive' 
      AND policyname = 'Super admins can view stock updates archive'
  ) THEN
    CREATE POLICY "Super admins can view stock updates archive"
    ON public.stock_updates_archive
    FOR SELECT
    USING (public.get_user_role(auth.uid()) = 'super_admin'::user_role);
  END IF;
END RsRs;

-- Recreate archive function with fixed search_path
CREATE OR REPLACE FUNCTION public.archive_old_stock_updates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS RsRs
DECLARE
  cutoff_date DATE := CURRENT_DATE - INTERVAL '1 year';
  rows_moved INTEGER;
BEGIN
  -- Move old records to archive
  WITH moved_rows AS (
    DELETE FROM public.stock_updates 
    WHERE update_date < cutoff_date
    RETURNING *
  )
  INSERT INTO public.stock_updates_archive 
  SELECT * FROM moved_rows;
  
  GET DIAGNOSTICS rows_moved = ROW_COUNT;
  
  RAISE NOTICE 'Archived % stock update records older than %', rows_moved, cutoff_date;
END;
RsRs;