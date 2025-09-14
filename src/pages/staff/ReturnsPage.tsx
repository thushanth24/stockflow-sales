import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Package, Loader2, Calendar, Download } from 'lucide-react';
import { generateSalesReportPDF, downloadPDF, FormattedItem } from '@/lib/pdfUtils';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  category_id: string | null;
}

interface ReturnEntry {
  product_id: string;
  quantity: number;
  reason: string;
}

function ReturnsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [returns, setReturns] = useState<any[]>([]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [newReturn, setNewReturn] = useState<ReturnEntry>({
    product_id: '',
    quantity: 1,
    reason: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch products with categories
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, current_stock, category_id, categories(name)')
        .order('name');

      if (productsError) throw productsError;
      const productsList = productsData || [];
      setProducts(productsList);
      setFilteredProducts(productsList);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
        
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
      
      // Fetch returns data
      const { data: returnsData, error: returnsError } = await supabase
        .from('returns')
        .select(`
          id,
          quantity,
          reason,
          return_date,
          products (
            id,
            name,
            sku,
            price,
            categories (
              name
            )
          )
        `)
        .order('return_date', { ascending: false });
        
      if (returnsError) throw returnsError;
      setReturns(returnsData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);



  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewReturn(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 0 : value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to record a return',
        variant: 'destructive',
      });
      return;
    }

    if (!newReturn.product_id || newReturn.quantity <= 0) {
      toast({
        title: 'Error',
        description: 'Please select a product and enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      console.log('Submitting return with data:', {
        product_id: newReturn.product_id,
        quantity: newReturn.quantity,
        reason: newReturn.reason,
        created_by: user.id,
        return_date: returnDate
      });

      // Call the handle_return function
      const { data, error } = await supabase
        .rpc('handle_return', {
          p_product_id: newReturn.product_id,
          p_quantity: newReturn.quantity,
          p_reason: newReturn.reason,
          p_created_by: user.id,
          p_return_date: returnDate
        });

      console.log('Return submission response:', { data, error });

      if (error) {
        console.error('RPC Error details:', error);
        // Show the actual error message from the database
        toast({
          title: 'Database Error',
          description: error.message || 'An error occurred while processing your request',
          variant: 'destructive',
        });
        return;
      }
      
      if (!data?.success) {
        const errorMessage = data?.error || 'Failed to process return';
        console.error('Return processing failed:', errorMessage);
        toast({
          title: 'Return Processing Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      // Reset form
      setNewReturn({
        product_id: '',
        quantity: 1,
        reason: ''
      });

      toast({
        title: 'Success',
        description: 'Return recorded successfully',
      });
    } catch (error) {
      console.error('Error recording return:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record return',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products based on selected category
  useEffect(() => {
    let result = [...products];
    
    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(p => p.category_id === selectedCategory);
    }
    
    setFilteredProducts(result);
    
    // Reset selected product if it's not in the filtered list
    if (newReturn.product_id && !result.some(p => p.id === newReturn.product_id)) {
      setNewReturn(prev => ({
        ...prev,
        product_id: ''
      }));
    }
  }, [selectedCategory, products, newReturn.product_id]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      
      // Format returns data for PDF
      const formattedReturns: FormattedItem[] = returns.map((ret: any) => ({
        id: ret.id,
        category_name: ret.products?.categories?.name || 'Uncategorized',
        product_name: ret.products?.name || 'Unknown Product',
        quantity: ret.quantity,
        unit_price: ret.products?.selling_price || 0,
        reason: ret.reason,
        return_date: ret.return_date,
        revenue: (ret.products?.selling_price || 0) * ret.quantity
      }));
      
      // Generate PDF with only returns data
      const doc = await generateSalesReportPDF([], [], new Date().toISOString().split('T')[0], formattedReturns);
      
      // Download the PDF
      downloadPDF(doc, 'returns_report');
      
      toast({
        title: 'Success',
        description: 'Returns report exported successfully',
      });
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export returns report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      {/* Header */}
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Return</h1>
          <p className="text-gray-500 text-sm">Record a product return</p>
        </div>
        <Button 
          onClick={handleExportPDF} 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={returns.length === 0 || loading}
        >
          <Download className="h-4 w-4" />
          Export Returns
        </Button>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category Filter */}
        <div className="space-y-2">
          <label htmlFor="category_filter" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <div className="relative">
            <select
              id="category_filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-base shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
              style={{
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                maxWidth: '100%',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Product Selection */}
        <div className="space-y-2">
          <label htmlFor="product_id" className="block text-sm font-medium text-gray-700">
            Product
          </label>
          <div className="relative">
            <select
              id="product_id"
              name="product_id"
              value={newReturn.product_id}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-base shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
              style={{
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                maxWidth: '100%',
                WebkitAppearance: 'none',
                MozAppearance: 'none'
              }}
              required
            >
              <option value="">Select a product</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="h-5 w-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantity
          </label>
          <div className="relative">
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="1"
              value={newReturn.quantity}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Return Date */}
        <div className="space-y-2">
          <label htmlFor="return_date" className="block text-sm font-medium text-gray-700">
            Return Date
          </label>
          <div className="relative">
            <input
              type="date"
              id="return_date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pl-10 text-base shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
            <Calendar className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
            Reason for Return
          </label>
          <textarea
            id="reason"
            name="reason"
            value={newReturn.reason}
            onChange={handleInputChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            rows={4}
            placeholder="Enter reason for return..."
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-6 py-3.5 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Package className="mr-2 h-5 w-5" />
              Record Return
            </div>
          )}
        </button>
      </form>
    </div>
  );
}

export { ReturnsPage as default };

