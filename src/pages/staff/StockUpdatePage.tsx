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
      const today = new Date().toISOString().split('T')[0];
      
      // Prepare stock update records - only for products with changes
      const stockUpdateRecords = stockUpdates
        .filter(update => {
          const product = products.find(p => p.id === update.product_id);
          return product && product.current_stock !== update.actual_stock;
        })
        .map(update => {
          const product = products.find(p => p.id === update.product_id);
          return {
            product_id: update.product_id,
            previous_stock: product?.current_stock || 0,
            actual_stock: update.actual_stock,
            update_date: today,
            created_by: user?.id,
          };
        });

      if (stockUpdateRecords.length > 0) {
        // Insert stock updates (this will trigger sales calculation)
        const { error } = await supabase
          .from('stock_updates')
          .insert(stockUpdateRecords);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Stock updated successfully. ${stockUpdateRecords.length} products had changes. Sales calculated automatically.`,
      });

      fetchProducts(); // Refresh to show updated stock
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="space-y-8 p-6 max-w-7xl mx-auto">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
          <h1 className="text-4xl font-bold tracking-tight">Daily Stock Update</h1>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Filter Products</h3>
                    <p className="text-xs text-gray-500">
                      {filteredProducts.length} products found
                    </p>
                  </div>
                  <div className="w-full sm:w-64">
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
            </div>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50 hidden sm:table-header-group">
                  <TableRow>
                    <TableHead className="w-1/2 sm:w-2/5 px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</TableHead>
                    <TableHead className="w-1/4 sm:w-1/5 px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Current</TableHead>
                    <TableHead className="w-1/4 sm:w-2/5 px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actual Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => {
                  const stockUpdate = stockUpdates.find(u => u.product_id === product.id);
                  const hasChanges = stockUpdate && stockUpdate.actual_stock !== product.current_stock;
                  
                  return (
                    <TableRow 
                      key={product.id}
                      className={`${hasChanges ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors duration-150 flex flex-col sm:table-row`}
                    >
                      <TableCell className="w-1/2 sm:w-2/5 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex justify-between sm:block">
                          <span className="text-xs font-medium text-gray-500 sm:hidden">Product</span>
                          <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="w-1/4 sm:w-1/5 px-3 sm:px-6 py-1 sm:py-4 whitespace-nowrap">
                        <div className="flex justify-between items-center sm:justify-end">
                          <span className="text-xs font-medium text-gray-500 sm:hidden">Current</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.current_stock > 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {product.current_stock}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="w-1/4 sm:w-2/5 px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                          <div className="flex justify-between items-center sm:justify-end">
                            <span className="text-xs font-medium text-gray-500 sm:hidden">Actual Count</span>
                            <Input
                              type="number"
                              min="0"
                              value={stockUpdate?.actual_stock || 0}
                              onChange={(e) => updateStockCount(
                                product.id,
                                parseInt(e.target.value) || 0
                              )}
                              className={`w-24 sm:w-32 text-right border-gray-300 focus:ring-blue-500 focus:border-blue-500 ${
                                hasChanges ? 'border-yellow-500 bg-yellow-50' : ''
                              }`}
                            />
                          </div>
                          {hasChanges && (
                            <span className="text-xs text-yellow-600 text-right sm:text-left">
                              {stockUpdate.actual_stock > product.current_stock ? '↑' : '↓'} 
                              {Math.abs(stockUpdate.actual_stock - product.current_stock)}
                            </span>
                          )}
                        </div>
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
                  <div className="text-sm text-gray-600">
                    Showing {paginatedProducts.length} of {filteredProducts.length} products
                  </div>
                  
                  <div className="w-full sm:w-auto flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-4">
                    <Button 
                      onClick={handleSubmit} 
                      disabled={submitting || !stockUpdates.some(update => {
                        const product = products.find(p => p.id === update.product_id);
                        return product && product.current_stock !== update.actual_stock;
                      })}
                      className={`w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md transition-all hover:scale-105 ${
                        submitting ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                      size="lg"
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
                    
                    <div className="w-full sm:w-auto">
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
      </div>
    </div>
  );
}