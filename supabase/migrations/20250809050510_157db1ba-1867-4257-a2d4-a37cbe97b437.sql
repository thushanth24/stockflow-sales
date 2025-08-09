-- Create archived stock updates table for old data
CREATE TABLE public.stock_updates_archive (
  LIKE public.stock_updates INCLUDING ALL
);

-- Function to archive old stock updates (older than 1 year)
CREATE OR REPLACE FUNCTION public.archive_old_stock_updates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create a scheduled function call (you could set this up as a cron job)
COMMENT ON FUNCTION public.archive_old_stock_updates() IS 'Archives stock update records older than 1 year to reduce table size';

-- Index on archive table for performance
CREATE INDEX idx_stock_updates_archive_date ON public.stock_updates_archive(update_date);
CREATE INDEX idx_stock_updates_archive_product ON public.stock_updates_archive(product_id);