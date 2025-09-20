import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import '@/types/supabase_rpc'; // Import RPC type definitions
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  current_stock: number;
  category_id: string | null;
  categories?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

interface SaleEntry {
  product_id: string;
  quantity_sold: number;
  price: number;
}

export default function SalesUpdatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [saleEntries, setSaleEntries] = useState<SaleEntry[]>([]);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    currentData: paginatedProducts,
    currentPage,
    totalPages,
    goToPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ data: filteredProducts, itemsPerPage: 15 });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);



  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, price, current_stock, category_id, categories(name)')
        .order('name');

      if (error) throw error;
      
      const productsData = (data || []) as Product[];
      setProducts(productsData);
      setFilteredProducts(productsData);
      // Initialize empty sale entries
      setSaleEntries([]);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };



  const filterProducts = (categoryId: string, search: string) => {
    let result = [...products];
    
    // Apply category filter
    if (categoryId && categoryId !== 'all') {
      result = result.filter(product => product.category_id === categoryId);
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredProducts(result);
  };

  const filterProductsByCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    filterProducts(categoryId, searchTerm);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterProducts(selectedCategory, value);
  };

  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = parseInt(value) || 0;
    setSaleEntries(prev => {
      const existingEntry = prev.find(entry => entry.product_id === productId);
      if (existingEntry) {
        return prev.map(entry =>
          entry.product_id === productId ? { ...entry, quantity_sold: quantity } : entry
        );
      }
      return [...prev, { product_id: productId, quantity_sold: quantity, price: 0 }];
    });
    setHasUnsavedChanges(true);
  };

  const updateSaleQuantity = (productId: string, quantity: number, price: number) => {
    setSaleEntries(prev => {
      const existingEntry = prev.find(entry => entry.product_id === productId);
      if (existingEntry) {
        return prev.map(entry =>
          entry.product_id === productId
            ? { ...entry, quantity_sold: quantity, price }
            : entry
        );
      } else {
        return [...prev, { product_id: productId, quantity_sold: quantity, price }];
      }
    });
    setHasUnsavedChanges(true);
  };

  // Handle beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleSubmit = async (e: React.FormEvent) => {
    setSubmitting(true);
    
    try {
      if (!selectedDate) {
        setSubmitting(false);
        toast({
          title: 'Date Required',
          description: 'Please select a date before recording sales',
          variant: 'destructive',
        });
        return;
      }
      
      // Filter out entries with 0 quantity
      const validEntries = saleEntries.filter(entry => entry.quantity_sold > 0);
      
      if (validEntries.length === 0) {
        throw new Error('Please enter sales quantities for at least one product.');
      }

      // Prepare sales records with product prices
      const salesRecords = validEntries.map(entry => {
        const product = products.find(p => p.id === entry.product_id);
        if (!product) throw new Error(`Product not found: ${entry.product_id}`);
        
        return {
          product_id: entry.product_id,
          quantity: entry.quantity_sold,
          sale_date: selectedDate,
          revenue: entry.quantity_sold * product.price
        };
      });

      // Insert sales records using the database function to bypass RLS
      const { error } = await supabase.rpc('insert_sales_records', {
        p_sales_data: salesRecords.map(record => ({
          product_id: record.product_id,
          quantity: record.quantity,
          revenue: record.revenue,
          sale_date: record.sale_date
        }))
      });
      
      if (error) throw error;

      // Update product stock levels
      for (const entry of validEntries) {
        const product = products.find(p => p.id === entry.product_id);
        if (product) {
          const newStock = product.current_stock - entry.quantity_sold;
          const { error: updateError } = await supabase
            .from('products')
            .update({ current_stock: newStock })
            .eq('id', entry.product_id);
          
          if (updateError) throw updateError;
        }
      }

      toast({
        title: 'Success',
        description: `Sales recorded for ${selectedDate}. ${validEntries.length} products updated.`,
      });

      // Refresh products to show updated stock levels
      fetchProducts();
      // Clear the form
      setSaleEntries([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setHasUnsavedChanges(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl h-28">
            <div className="space-y-3 w-full">
              <div className="h-8 bg-blue-500/30 rounded w-1/3"></div>
              <div className="h-4 bg-blue-500/30 rounded w-1/2 max-w-md"></div>
            </div>
          </div>
          
          {/* Form Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="space-y-6">
              {/* Filters Skeleton */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-24"></div>
                    <div className="h-10 bg-gray-100 rounded-md"></div>
                  </div>
                  <div className="w-full sm:w-1/2 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-24"></div>
                    <div className="h-10 bg-gray-100 rounded-md"></div>
                  </div>
                </div>
                
                <div className="w-full sm:w-1/3 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-24"></div>
                  <div className="h-10 bg-gray-100 rounded-md"></div>
                  <div className="h-3 bg-gray-100 rounded w-64"></div>
                </div>
              </div>
              
              {/* Table Skeleton */}
              <div className="space-y-4">
                <div className="h-5 bg-gray-200 rounded w-32"></div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="grid grid-cols-3 gap-4 p-4 border-b border-gray-100">
                      <div className="space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                      </div>
                      <div className="flex items-center">
                        <div className="h-8 bg-gray-100 rounded-md w-20"></div>
                      </div>
                      <div className="flex items-center justify-end">
                        <div className="h-10 bg-gray-100 rounded-md w-24"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Action Buttons Skeleton */}
              <div className="flex justify-end space-x-3 pt-4">
                <div className="h-10 bg-gray-100 rounded-md w-24"></div>
                <div className="h-10 bg-blue-100 rounded-md w-32"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="space-y-4 sm:space-y-6"
      >
        <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
          <motion.div
            className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg sm:rounded-xl text-white shadow-lg"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Daily Sales Entry</h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm sm:shadow-xl">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="space-y-4 sm:space-y-6">
                  <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-full sm:w-auto">
                    <h3 className="text-sm font-medium text-gray-700">Record Sales</h3>
                    <p className="text-xs text-gray-500">
                      {filteredProducts.length} active products
                    </p>
                  </div>
                  <div className="w-full sm:w-56 md:w-64">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="w-full sm:w-64">
                <Select value={selectedCategory} onValueChange={filterProductsByCategory}>
                  <SelectTrigger className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="focus:bg-blue-50">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem 
                        key={category.id} 
                        value={category.id}
                        className="focus:bg-blue-50"
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Date selection for stock update */}
              <div className="w-full sm:w-64">
                <Label className="text-sm text-gray-700">Sales Date *</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`mt-1 w-full bg-white ${!selectedDate ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-blue-500`}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select the date for these sales entries
                </p>
                {!selectedDate && (
                  <p className="text-xs text-red-500 mt-1">
                    Please select a date before recording sales
                  </p>
                )}
              </div>
              </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              {/* Mobile list view */}
              <div className="sm:hidden divide-y -mx-2">
                {paginatedProducts.map((product, idx) => {
                  const saleEntry = saleEntries.find(entry => entry.product_id === product.id) || 
                    { product_id: product.id, quantity_sold: 0, price: product.price };
                  const total = saleEntry.quantity_sold * saleEntry.price;
                  const hasEntry = saleEntry.quantity_sold > 0;
                  
                  return (
                    <motion.div
                      key={product.id}
                      className={`p-3 space-y-3 ${hasEntry ? 'bg-blue-50' : 'bg-white'}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: 0.05 * idx }}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">In Stock</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.current_stock > 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {product.current_stock}
                        </span>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Price</Label>
                        <Input
                          type="text"
                          value={`Rs${product.price.toFixed(2)}`}
                          disabled
                          className="mt-1 w-full text-right border-gray-200 bg-gray-50"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Quantity Sold</Label>
                          <Input
                            type="number"
                            min="0"
                            max={product.current_stock}
                            value={focusedInput === product.id 
                              ? saleEntries.find(e => e.product_id === product.id)?.quantity_sold === 0 
                                ? '' 
                                : saleEntries.find(e => e.product_id === product.id)?.quantity_sold || ''
                              : saleEntry.quantity_sold || ''}
                            onFocus={() => setFocusedInput(product.id)}
                            onBlur={() => setFocusedInput(null)}
                            onChange={(e) => {
                              const value = e.target.value;
                              const quantity = value === '' ? 0 : Math.min(parseInt(value) || 0, product.current_stock);
                              updateSaleQuantity(product.id, quantity, product.price);
                            }}
                            className={`mt-1 w-full text-right border-gray-300 focus:ring-blue-500 focus:border-blue-500 py-2 px-3 h-10 ${
                              hasEntry ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">Total: </span>
                          <span className={`text-sm font-medium ${
                            hasEntry ? 'text-blue-700' : 'text-gray-500'
                          }`}>
                            Rs{total.toFixed(2)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="p-6 text-center">
                      <Package className="h-12 w-12 text-gray-400 mx-auto" />
                      <h3 className="text-lg font-medium text-gray-700 mt-2">
                        {selectedCategory === 'all' ? 'No products found' : 'No products in this category'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedCategory === 'all' ? 'Add products to get started with sales tracking.' : 'Try selecting a different category.'}
                      </p>
                      {selectedCategory !== 'all' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => filterProductsByCategory('all')} 
                          className="mt-2"
                        >
                          Show All Products
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop/tablet table view */}
              <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
                <Table className="min-w-full divide-y divide-gray-200">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-2/5 px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</TableHead>
                      <TableHead className="w-1/5 px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">In Stock</TableHead>
                      <TableHead className="w-1/5 px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Price</TableHead>
                      <TableHead className="w-1/5 px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Qty Sold</TableHead>
                      <TableHead className="w-1/5 px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => {
                    const saleEntry = saleEntries.find(entry => entry.product_id === product.id) || 
                      { product_id: product.id, quantity_sold: 0, price: product.price };
                    const total = saleEntry.quantity_sold * saleEntry.price;
                    const hasEntry = saleEntry.quantity_sold > 0;
                    
                    return (
                      <TableRow 
                        key={product.id}
                        className={`${hasEntry ? 'bg-blue-50' : 'hover:bg-gray-50'} transition-colors duration-150`}
                      >
                        <TableCell className="w-2/5 px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                        </TableCell>
                        
                        <TableCell className="w-1/5 px-6 py-4 whitespace-nowrap text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.current_stock > 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {product.current_stock}
                          </span>
                        </TableCell>

                        <TableCell className="w-1/5 px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-gray-900">
                            Rs{product.price.toFixed(2)}
                          </span>
                        </TableCell>
                        
                        <TableCell className="w-1/5 px-6 py-4 whitespace-nowrap text-right">
                          <Input
                            type="number"
                            min="0"
                            max={product.current_stock}
                            value={saleEntry.quantity_sold}
                            onChange={(e) => updateSaleQuantity(
                              product.id,
                              Math.min(parseInt(e.target.value) || 0, product.current_stock),
                              product.price
                            )}
                            className={`w-24 text-right border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${
                              hasEntry ? 'border-blue-500 bg-blue-50' : ''
                            }`}
                          />
                        </TableCell>

                        <TableCell className="w-1/5 px-6 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-medium ${
                            hasEntry ? 'text-blue-700' : 'text-gray-500'
                          }`}>
                            Rs{total.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Package className="h-12 w-12 text-gray-400" />
                          <h3 className="text-lg font-medium text-gray-700">
                            {selectedCategory === 'all' 
                              ? 'No products found' 
                              : 'No products in this category'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {selectedCategory === 'all'
                              ? 'Add products to get started with stock updates.'
                              : 'Try selecting a different category.'}
                          </p>
                          {selectedCategory !== 'all' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => filterProductsByCategory('all')}
                              className="mt-2"
                            >
                              Show All Products
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </TableBody>
                </Table>
              </div>
              
              {filteredProducts.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-sm text-gray-600 whitespace-nowrap">
                      Showing {paginatedProducts.length} of {filteredProducts.length} products
                      {saleEntries.length > 0 && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {saleEntries.length} with sales
                        </span>
                      )}
                    </div>
                    
                    <div className="w-full sm:w-auto flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-3">
                      <Button 
                        onClick={handleSubmit} 
                        disabled={submitting || !selectedDate || saleEntries.length === 0}
                        className={`w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md transition-all hover:scale-105 ${
                          submitting ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                        size="lg"
                        style={{ minWidth: '180px' }}
                      >
                        {submitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          'Record Sales'
                        )}
                      </Button>
                      
                      <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                        <PaginationControls
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={(page: number) => goToPage(page)}
                          canGoNext={canGoNext}
                          canGoPrevious={canGoPrevious}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
