import { useState, useEffect, useCallback } from 'react';
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
import { Package, RotateCcw } from 'lucide-react';
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

interface RestoreEntry {
  product_id: string;
  quantity: number;
  price: number;
  sale_id: string;
}

export default function RestoreSalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [restoreEntries, setRestoreEntries] = useState<RestoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);
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

  useEffect(() => {
    if (selectedDate) {
      fetchSalesByDate(selectedDate);
    }
  }, [selectedDate]);

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

  const fetchSalesByDate = async (date: string) => {
    try {
      console.log('[fetchSalesByDate] Fetching sales for date:', date);
      
      // First, let's check what dates we have sales for
      const { data: allSales, error: allSalesError } = await supabase
        .from('sales')
        .select('sale_date, quantity, product_id')
        .order('sale_date', { ascending: false })
        .limit(50);
      
      if (allSalesError) throw allSalesError;
      
      console.log('Available sales dates:', 
        [...new Set(allSales?.map(s => s.sale_date))]
      );
      
      // Now get sales for the requested date
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('sale_date', date);
      
      if (salesError) throw salesError;
      
      console.log('[fetchSalesByDate] Raw sales data for', date, ':', salesData);
      
      // If no sales, clear the list and return
      if (!salesData || salesData.length === 0) {
        console.log('[fetchSalesByDate] No sales found for date:', date);
        console.log('Available dates with sales:', 
          [...new Set(allSales?.map(s => s.sale_date))]
        );
        setRecentSales([]);
        return;
      }
      
      // Get product IDs to fetch product details
      const productIds = [...new Set(salesData.map(sale => sale.product_id))];
      const productsMap: Record<string, any> = {};
      
      if (productIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);
          
        if (productsError) throw productsError;
        
        // Create a map of product ID to product details
        productsData?.forEach(product => {
          productsMap[product.id] = product;
        });
      }
      
      // Get all restorations for these sales
      const saleIds = salesData.map(sale => sale.id);
      let restoredQuantities: Record<string, number> = {};
      
      if (saleIds.length > 0) {
        const { data: restorations, error: restorationsError } = await supabase
          .from('sales_restorations')
          .select('sale_id, quantity_restored')
          .in('sale_id', saleIds);
          
        if (restorationsError) throw restorationsError;
        
        // Calculate total restored quantities per sale
        restorations?.forEach(restoration => {
          if (!restoredQuantities[restoration.sale_id]) {
            restoredQuantities[restoration.sale_id] = 0;
          }
          restoredQuantities[restoration.sale_id] += restoration.quantity_restored;
        });
      }
      
      // Process sales with their restored quantities
      const processedSales = salesData.map(sale => {
        const restoredQty = restoredQuantities[sale.id] || 0;
        const remainingQty = sale.quantity - restoredQty;
        const product = productsMap[sale.product_id] || {};
        
        // Debug log for all sales
        console.log('[fetchSalesByDate] Processing sale:', {
          saleId: sale.id,
          productId: sale.product_id,
          quantity: sale.quantity,
          restoredQty,
          remainingQty,
          product,
          productName: product?.name || 'Unknown'
        });
        
        return {
          ...sale,
          product_name: product?.name || 'Unknown Product',
          price: product?.price || 0,
          original_quantity: sale.quantity,
          restored_quantity: restoredQty,
          quantity: remainingQty,
          is_fully_restored: remainingQty <= 0
        };
      });
      
      console.log('[fetchSalesByDate] All processed sales:', processedSales);
      
      // Show all sales, including those that have been fully restored
      console.log('[fetchSalesByDate] All sales:', processedSales);
      setRecentSales(processedSales);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch sales data',
        variant: 'destructive',
      });
    }
  };

  const filterProducts = (categoryId: string, search: string) => {
    let result = [...products];
    
    if (categoryId && categoryId !== 'all') {
      result = result.filter(product => product.category_id === categoryId);
    }
    
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

  const updateRestoreQuantity = (productId: string, quantity: number, saleId: string, price: number) => {
    setRestoreEntries(prev => {
      const existingEntry = prev.find(entry => entry.sale_id === saleId);
      if (existingEntry) {
        return prev.map(entry =>
          entry.sale_id === saleId
            ? { ...entry, quantity, price }
            : entry
        );
      } else {
        return [...prev, { product_id: productId, quantity, sale_id: saleId, price }];
      }
    });
    setHasUnsavedChanges(true);
  };

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

  const handleRestore = async () => {
    console.log('[RestoreSales] Starting sales restoration process');
    setSubmitting(true);
    
    try {
      if (!selectedDate) {
        console.warn('[RestoreSales] No date selected');
        setSubmitting(false);
        toast({
          title: 'Date Required',
          description: 'Please select a date before restoring sales',
          variant: 'destructive',
        });
        return;
      }
      
      // Filter out entries with 0 quantity
      const validEntries = restoreEntries.filter(entry => entry.quantity > 0);
      console.log(`[RestoreSales] Found ${validEntries.length} valid entries to process`);
      
      if (validEntries.length === 0) {
        console.warn('[RestoreSales] No valid entries with quantity > 0');
        throw new Error('Please enter quantities to restore for at least one product.');
      }

      // Process each restoration in sequence to avoid race conditions
      const results = [];
      const fullyRestoredSales: string[] = [];
      const partiallyRestoredSales: string[] = [];
      
      for (const [index, entry] of validEntries.entries()) {
        const sale = recentSales.find(s => s.id === entry.sale_id);
        if (!sale) {
          console.warn(`[RestoreSales] Sale ${entry.sale_id} not found in recent sales`);
          continue;
        }
        
        const quantityToRestore = Math.min(entry.quantity, sale.quantity);
        if (quantityToRestore <= 0) {
          console.warn(`[RestoreSales] Invalid quantity to restore for sale ${entry.sale_id}: ${quantityToRestore}`);
          continue;
        }

        console.log(`[RestoreSales] [${index + 1}/${validEntries.length}] Processing sale ${entry.sale_id} - Restoring ${quantityToRestore} items (requested: ${entry.quantity}, available: ${sale.quantity})`);

        try {
          // Use the database function to handle the restoration
          console.log(`[RestoreSales] Calling handle_sales_restoration RPC for sale ${entry.sale_id}`);
          const { data, error } = await supabase
            .rpc('handle_sales_restoration', {
              p_sale_id: entry.sale_id,
              p_product_id: entry.product_id,
              p_quantity: quantityToRestore,
              p_user_id: user?.id
            });

          if (error) {
            console.error(`[RestoreSales] RPC error for sale ${entry.sale_id}:`, error);
            throw error;
          }
          
          console.log(`[RestoreSales] RPC response for sale ${entry.sale_id}:`, data);
          
          if (data?.success) {
            results.push(data);
            if (data.sale_deleted) {
              console.log(`[RestoreSales] Successfully fully restored sale ${entry.sale_id}`);
              fullyRestoredSales.push(sale.product_name || `Sale ${sale.id.substring(0, 8)}`);
            } else if (data.sale_updated) {
              console.log(`[RestoreSales] Successfully partially restored sale ${entry.sale_id}, remaining quantity: ${data.remaining_quantity}`);
              partiallyRestoredSales.push(sale.product_name || `Sale ${sale.id.substring(0, 8)}`);
            }
          } else {
            console.warn(`[RestoreSales] RPC call for sale ${entry.sale_id} was not successful:`, data);
          }
        } catch (error) {
          console.error(`[RestoreSales] Error restoring sale ${entry.sale_id}:`, error);
          toast({
            title: 'Error',
            description: `Failed to restore sale: ${error.message}`,
            variant: 'destructive',
          });
        }
      }

      // Log and show success messages
      console.log(`[RestoreSales] Restoration complete. Results: ${results.length} processed, ${fullyRestoredSales.length} fully restored, ${partiallyRestoredSales.length} partially restored`);
      
      if (fullyRestoredSales.length > 0) {
        console.log(`[RestoreSales] Fully restored sales:`, fullyRestoredSales);
        toast({
          title: 'Fully Restored',
          description: `Fully restored ${fullyRestoredSales.length} sales.`,
          variant: 'default',
        });
      }
      
      if (partiallyRestoredSales.length > 0) {
        console.log(`[RestoreSales] Partially restored sales:`, partiallyRestoredSales);
        toast({
          title: 'Partially Restored',
          description: `Partially restored ${partiallyRestoredSales.length} sales.`,
          variant: 'default',
        });
      }

      // Refresh data
      console.log('[RestoreSales] Refreshing product and sales data...');
      try {
        await Promise.all([
          fetchProducts(),
          fetchSalesByDate(selectedDate)
        ]);
        console.log('[RestoreSales] Data refresh complete');
      } catch (error) {
        console.error('[RestoreSales] Error refreshing data:', error);
      }
      
      console.log('[RestoreSales] Clearing restore entries');
      setRestoreEntries([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore sales',
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
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl h-28">
            <div className="space-y-3 w-full">
              <div className="h-8 bg-indigo-500/30 rounded w-1/3"></div>
              <div className="h-4 bg-indigo-500/30 rounded w-1/2 max-w-md"></div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="space-y-6">
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
              
              <div className="flex justify-end space-x-3 pt-4">
                <div className="h-10 bg-gray-100 rounded-md w-24"></div>
                <div className="h-10 bg-indigo-100 rounded-md w-32"></div>
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
            className="p-4 sm:p-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg sm:rounded-xl text-white shadow-lg"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Restore Sales</h1>
            <p className="mt-2 text-sm sm:text-base text-indigo-100">
              Restore sold items and add them back to inventory
            </p>
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
                        <h3 className="text-sm font-medium text-gray-700">Restore Products</h3>
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
                            className="w-full bg-white border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="w-full">
                        <Label className="text-sm text-gray-700">Filter by Category</Label>
                        <Select value={selectedCategory} onValueChange={filterProductsByCategory}>
                          <SelectTrigger className="w-full mt-1 border-gray-300 focus:ring-indigo-500 focus:border-indigo-500">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="focus:bg-indigo-50">All Categories</SelectItem>
                            {categories.map((category) => (
                              <SelectItem 
                                key={category.id} 
                                value={category.id}
                                className="focus:bg-indigo-50"
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-full">
                        <Label className="text-sm text-gray-700">Sales Date *</Label>
                        <Input
                          type="date"
                          value={selectedDate}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className={`mt-1 w-full bg-white ${!selectedDate ? 'border-red-500' : 'border-gray-300'} focus:border-indigo-500 focus:ring-indigo-500`}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Select the date of sales to restore
                        </p>
                        {!selectedDate && (
                          <p className="text-xs text-red-500 mt-1">
                            Please select a date to view sales
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    {selectedDate ? (
                      recentSales.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Sold</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Qty to Restore</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {recentSales.map((sale) => {
                                const product = products.find(p => p.id === sale.product_id);
                                const restoreEntry = restoreEntries.find(entry => entry.sale_id === sale.id) || 
                                  { product_id: sale.product_id, quantity: 0, sale_id: sale.id, price: sale.price || 0 };
                                const salePrice = Number(sale?.price) || 0;
                                const total = (restoreEntry?.quantity || 0) * salePrice;
                                const maxQuantity = sale?.quantity || 0;
                                
                                return (
                                  <TableRow key={sale.id}>
                                    <TableCell className="font-medium">
                                      {product?.name || 'Product not found'}
              
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {sale.quantity} {sale.restored_quantity > 0 && 
                                        <span className="text-xs text-gray-500 ml-1">
                                          (restored: {sale.restored_quantity}/{sale.original_quantity})
                                        </span>
                                      }
                                    </TableCell>
                                    <TableCell className="text-right">Rs{Number(sale?.price || 0).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                      <Input
                                        type="number"
                                        min="0"
                                        max={maxQuantity}
                                        value={restoreEntry.quantity}
                                        onChange={(e) => updateRestoreQuantity(
                                          sale.product_id,
                                          Math.min(parseInt(e.target.value) || 0, maxQuantity),
                                          sale.id,
                                          sale.price
                                        )}
                                        disabled={sale.restored_quantity >= sale.original_quantity}
                                        className={`w-24 text-right border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 ${
                                          sale.restored_quantity >= sale.original_quantity ? 'bg-gray-100' : ''
                                        }`}
                                      />
                                      <div className="text-xs text-gray-500 mt-1">
                                        Max: {maxQuantity}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      Rs{Number(total || 0).toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <Package className="h-12 w-12 text-gray-400 mx-auto" />
                          <h3 className="text-lg font-medium text-gray-700 mt-2">
                            No sales found for this date
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Try selecting a different date or check your sales records.
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="p-6 text-center">
                        <RotateCcw className="h-12 w-12 text-gray-400 mx-auto" />
                        <h3 className="text-lg font-medium text-gray-700 mt-2">
                          Select a date to view sales
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Choose a date to see sales that can be restored.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {recentSales.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="text-sm text-gray-600 whitespace-nowrap">
                          Showing {recentSales.length} sales on {selectedDate}
                          {restoreEntries.length > 0 && (
                            <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                              {restoreEntries.length} selected for restore
                            </span>
                          )}
                        </div>
                        
                        <div className="w-full sm:w-auto flex justify-end">
                          <Button 
                            onClick={handleRestore} 
                            disabled={submitting || restoreEntries.length === 0}
                            className={`w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-md transition-all hover:scale-105 ${
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
                                Restoring...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Restore Selected
                              </>
                            )}
                          </Button>
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
