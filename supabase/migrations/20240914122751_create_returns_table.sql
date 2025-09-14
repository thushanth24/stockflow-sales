-- Create returns table
CREATE TABLE public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for returns
CREATE POLICY "All authenticated users can view returns" ON public.returns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and above can insert returns" ON public.returns
  FOR INSERT TO authenticated WITH CHECK (public.get_user_role(auth.uid()) IN ('staff', 'admin', 'super_admin'));

CREATE POLICY "Admins and above can update returns" ON public.returns
  FOR UPDATE TO authenticated USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

CREATE POLICY "Admins and above can delete returns" ON public.returns
  FOR DELETE TO authenticated USING (public.get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- Create index for better performance
CREATE INDEX idx_returns_product_id ON public.returns(product_id);
CREATE INDEX idx_returns_return_date ON public.returns(return_date);

-- Add function to update stock when a return is added
CREATE OR REPLACE FUNCTION handle_return()
RETURNS TRIGGER AS $$
BEGIN
  -- Increase the product's current_stock when a return is added
  UPDATE public.products 
  SET current_stock = current_stock + NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for the function
CREATE TRIGGER after_return_added
AFTER INSERT ON public.returns
FOR EACH ROW EXECUTE FUNCTION handle_return();

-- Add comment for the table
COMMENT ON TABLE public.returns IS 'Tracks product returns from customers';

-- Add comments for columns
COMMENT ON COLUMN public.returns.quantity IS 'Number of items returned';
COMMENT ON COLUMN public.returns.reason IS 'Reason for the return';
COMMENT ON COLUMN public.returns.return_date IS 'Date when the return was processed';
COMMENT ON COLUMN public.returns.created_by IS 'User who processed the return';
