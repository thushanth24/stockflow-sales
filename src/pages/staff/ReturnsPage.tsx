import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Package, Plus, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

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
  categories?: {
    name: string;
  };
}

interface ReturnItem {
  id: string;
  product_id: string;
  quantity: number;
  reason: string;
  return_date: string;
  created_by: string;
  created_at: string;
  products: {
    name: string;
    sku: string;
  };
}

interface ReturnEntry {
  product_id: string;
  quantity: number;
  reason: string;
}

export default function ReturnsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [newReturn, setNewReturn] = useState<ReturnEntry>({
    product_id: '',
    quantity: 1,
    reason: ''
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const {
    currentData: paginatedReturns,
    currentPage,
    totalPages,
    goToPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ data: returns, itemsPerPage: 10 });

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

      // Fetch recent returns
      await fetchReturns();
      
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

  // Fetch returns with product details
  const fetchReturns = async () => {
    try {
      const { data: returnsData, error } = await supabase
        .from('returns')
        .select(`
          *,
          products:product_id (name, sku, categories(name))
        `)
        .order('return_date', { ascending: false });

      if (error) throw error;

      setReturns(returnsData as unknown as ReturnItem[]);
    } catch (error) {
      console.error('Error fetching returns:', error);
      throw error; // Re-throw to be caught by the caller
    }
  };

  // Fetch returns when component mounts
  useEffect(() => {
    fetchReturns();
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

      // Refresh returns list
      await fetchReturns();

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

  // Filter products based on search term and selected category
  useEffect(() => {
    let result = [...products];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.sku.toLowerCase().includes(term)
      );
    }
    
    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(p => p.category_id === selectedCategory);
    }
    
    setFilteredProducts(result);
  }, [searchTerm, selectedCategory, products]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Returns Management</h1>
          <p className="text-muted-foreground">Record and manage product returns</p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Record New Return</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="returnDate">Return Date</Label>
                <div className="relative">
                  <Input
                    id="returnDate"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="pl-10"
                    required
                  />
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Product</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="category" className="text-xs">Category</Label>
                    <select
                      id="category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="search" className="text-xs">Search</Label>
                    <Input
                      id="search"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="product_id" className="text-xs">Product</Label>
                  <select
                    id="product_id"
                    name="product_id"
                    value={newReturn.product_id}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select a product</option>
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku}) - Stock: {product.current_stock}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  value={newReturn.quantity}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Return</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  value={newReturn.reason}
                  onChange={handleInputChange}
                  placeholder="Enter the reason for return..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Record Return
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Returns</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : returns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 mb-2" />
                <p>No returns recorded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReturns.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {format(new Date(item.return_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{item.products?.name || 'N/A'}</TableCell>
                          <TableCell>{item.products?.sku || 'N/A'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="max-w-xs truncate">{item.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  canGoNext={canGoNext}
                  canGoPrevious={canGoPrevious}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
