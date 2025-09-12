import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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

interface StockUpdate {
  product_id: string;
  actual_stock: number;
}

export default function StockUpdatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockUpdates, setStockUpdates] = useState<StockUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [lastUpdateDate, setLastUpdateDate] = useState<string | null>(null);
  const [existingUpdatesMap, setExistingUpdatesMap] = useState<Record<string, { previous_stock: number; actual_stock: number }>>({});
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
    fetchLastUpdateDate();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchExistingUpdatesForDate(selectedDate);
    } else {
      setExistingUpdatesMap({});
    }
  }, [selectedDate]);



  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, current_stock, category_id, categories(name)')
        .order('name');

      if (error) throw error;
      
      const productsData = data || [];
      setProducts(productsData);
      setFilteredProducts([]); // Start with empty filtered products
      // Initialize stock updates with current stock
      setStockUpdates(
        productsData.map(product => ({
          product_id: product.id,
          actual_stock: product.current_stock,
        }))
      );
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

  const fetchLastUpdateDate = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_updates')
        .select('update_date')
        .order('update_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        setLastUpdateDate(data[0].update_date as unknown as string);
      } else {
        setLastUpdateDate(null);
      }
    } catch (error) {
      console.error('Error fetching last update date:', error);
    }
  };

  const fetchExistingUpdatesForDate = async (date: string) => {
    try {
      const { data, error } = await supabase
        .from('stock_updates')
        .select('product_id, previous_stock, actual_stock')
        .eq('update_date', date);
      if (error) throw error;
      const map: Record<string, { previous_stock: number; actual_stock: number }> = {};
      (data || []).forEach((row: any) => {
        map[row.product_id] = { previous_stock: row.previous_stock, actual_stock: row.actual_stock };
      });
      setExistingUpdatesMap(map);

      // Prefill actual counts with existing values for this date when available
      setStockUpdates(prev =>
        prev.map(u =>
          map[u.product_id]
            ? { ...u, actual_stock: map[u.product_id].actual_stock }
            : u
        )
      );
    } catch (error) {
      console.error('Error fetching existing updates for date:', error);
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

  const updateStockCount = (productId: string, actualStock: number) => {
    setStockUpdates(prev =>
      prev.map(update =>
        update.product_id === productId
          ? { ...update, actual_stock: actualStock }
          : update
      )
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      if (!selectedDate) {
        throw new Error('Please select a date for the stock update.');
      }
      
      // Prepare stock update records - only for products with changes
      const stockUpdateRecords = stockUpdates
        .filter(update => {
          const product = products.find(p => p.id === update.product_id);
          return product && product.current_stock !== update.actual_stock;
        })
        .map(update => {
          const product = products.find(p => p.id === update.product_id);
          const existing = existingUpdatesMap[update.product_id];
          return {
            product_id: update.product_id,
            // Preserve previous_stock if record exists for this date; otherwise use current product stock as baseline
            previous_stock: existing ? existing.previous_stock : (product?.current_stock || 0),
            actual_stock: update.actual_stock,
            update_date: selectedDate,
            created_by: user?.id,
          };
        });

      if (stockUpdateRecords.length > 0) {
        if (lastUpdateDate && selectedDate === lastUpdateDate) {
          // Allow editing the last update date via upsert
          const { error } = await supabase
            .from('stock_updates')
            .upsert(stockUpdateRecords, { onConflict: 'product_id,update_date' });
          if (error) throw error;
        } else {
          // Insert new date records only
          const { error } = await supabase
            .from('stock_updates')
            .insert(stockUpdateRecords);
          if (error) throw error;
        }
      }

      toast({
        title: 'Success',
        description: `Stock updated for ${selectedDate}. ${stockUpdateRecords.length} products had changes. Sales calculated automatically.`,
      });

      // Refresh latest date and products
      fetchLastUpdateDate();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 py-8 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        <div className="space-y-6">
          <Skeleton className="h-16 md:h-24 w-full rounded-xl" />
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Loading Products...</h3>
                  <p className="text-xs text-gray-500">Please wait while we load your products</p>
                </div>
                <div className="w-full sm:w-64">
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="w-full sm:w-64">
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Daily Stock Update</h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
        <Card className="border-0 shadow-sm sm:shadow-xl">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-full sm:w-auto">
                    <h3 className="text-sm font-medium text-gray-700">Filter Products</h3>
                    <p className="text-xs text-gray-500">
                      {filteredProducts.length} products found
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
                <Label className="text-sm text-gray-700">Stock Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1 w-full bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {lastUpdateDate
                    ? `Only the most recent date (${lastUpdateDate}) can be edited. Other dates allow new inserts only.`
                    : 'No previous stock updates found. Any date will create new records.'}
                </p>
              </div>
              </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              {/* Mobile list view */}
              <div className="sm:hidden divide-y -mx-2">
                {paginatedProducts.map((product, idx) => {
                  const stockUpdate = stockUpdates.find(u => u.product_id === product.id);
                  const hasChanges = stockUpdate && stockUpdate.actual_stock !== product.current_stock;
                  return (
                    <motion.div
                      key={product.id}
                      className={`p-3 space-y-3 ${hasChanges ? 'bg-yellow-50' : 'bg-white'}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: 0.05 * idx }}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Current</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.current_stock > 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {product.current_stock}
                        </span>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Actual Count</Label>
                        <Input
                          type="number"
                          min="0"
                          value={stockUpdate?.actual_stock || 0}
                          onChange={(e) => updateStockCount(product.id, parseInt(e.target.value) || 0)}
                          className={`mt-1 w-full text-right border-gray-300 focus:ring-blue-500 focus:border-blue-500 py-2 px-3 h-10 ${hasChanges ? 'border-yellow-500 bg-yellow-50' : ''}`}
                        />
                        {hasChanges && (
                          <span className="text-xs text-yellow-600">Change: {stockUpdate.actual_stock > product.current_stock ? '+' : '-'}{Math.abs(stockUpdate.actual_stock - product.current_stock)}</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div className="p-6 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Package className="h-12 w-12 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-700">
                        {selectedCategory === 'all' ? 'No products found' : 'No products in this category'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedCategory === 'all' ? 'Add products to get started with stock updates.' : 'Try selecting a different category.'}
                      </p>
                      {selectedCategory !== 'all' && (
                        <Button variant="outline" size="sm" onClick={() => filterProductsByCategory('all')} className="mt-2">Show All Products</Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop/tablet table view */}
              <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
                <Table className="min-w-full divide-y divide-gray-200">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-2/5 px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</TableHead>
                      <TableHead className="w-1/5 px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Current</TableHead>
                      <TableHead className="w-2/5 px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actual Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => {
                    const stockUpdate = stockUpdates.find(u => u.product_id === product.id);
                    const hasChanges = stockUpdate && stockUpdate.actual_stock !== product.current_stock;
                    
                    return (
                      <TableRow 
                        key={product.id}
                        className={`${hasChanges ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors duration-150`}
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
                        
                        <TableCell className="w-2/5 px-6 py-4 whitespace-nowrap text-right">
                          <Input
                            type="number"
                            min="0"
                            value={stockUpdate?.actual_stock || 0}
                            onChange={(e) => updateStockCount(
                              product.id,
                              parseInt(e.target.value) || 0
                            )}
                            className={`w-32 text-right border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${
                              hasChanges ? 'border-yellow-500 bg-yellow-50' : ''
                            }`}
                          />
                          {hasChanges && (
                            <span className="ml-2 text-xs text-yellow-600">
                              {stockUpdate.actual_stock > product.current_stock ? '↑' : '↓'}
                              {Math.abs(stockUpdate.actual_stock - product.current_stock)}
                            </span>
                          )}
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
              </div>
              
              {filteredProducts.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="text-sm text-gray-600 whitespace-nowrap">
                    Showing {paginatedProducts.length} of {filteredProducts.length} products
                  </div>
                  
                  <div className="w-full sm:w-auto flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-3">
                    <Button 
                      onClick={handleSubmit} 
                      disabled={submitting || !selectedDate || !stockUpdates.some(update => {
                        const product = products.find(p => p.id === update.product_id);
                        return product && product.current_stock !== update.actual_stock;
                      })}
                      className={`w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md transition-all hover:scale-105 ${
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
                          Updating...
                        </>
                      ) : (
                        'Update All Stock Counts'
                      )}
                    </Button>
                    
                    <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                      <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={goToPage}
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
