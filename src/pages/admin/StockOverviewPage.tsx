import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Package, AlertTriangle, TrendingDown, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

interface Category {
  id: string;
  name: string;
}

interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  price: number;
  current_stock: number;
  created_at: string;
  category_id: string | null;
  categories?: {
    name: string;
  };
}

interface StockUpdateWithProduct {
  id: string;
  previous_stock: number;
  actual_stock: number;
  update_date: string;
  products: {
    name: string;
    sku: string;
  };
}

export default function StockOverviewPage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithStock[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('none');
  const [recentUpdates, setRecentUpdates] = useState<StockUpdateWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const {
    currentData: paginatedProducts,
    currentPage: productsCurrentPage,
    totalPages: productsTotalPages,
    goToPage: goToProductsPage,
    canGoNext: productsCanGoNext,
    canGoPrevious: productsCanGoPrevious,
  } = usePagination({ data: filteredProducts, itemsPerPage: 10 });

  const {
    currentData: paginatedUpdates,
    currentPage: updatesCurrentPage,
    totalPages: updatesTotalPages,
    goToPage: goToUpdatesPage,
    canGoNext: updatesCanGoNext,
    canGoPrevious: updatesCanGoPrevious,
  } = usePagination({ data: recentUpdates, itemsPerPage: 10 });

  useEffect(() => {
    fetchStockData();
    fetchCategories();
  }, []);

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

  const filterProductsByCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'all') {
      setFilteredProducts(products);
    } else if (categoryId !== 'none') {
      setFilteredProducts(products.filter(product => product.category_id === categoryId));
    } else {
      setFilteredProducts([]);
    }
  };

  const fetchStockData = async () => {
    try {
      // Fetch all products with current stock and category info
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);
      setFilteredProducts([]); // Start with empty filtered products

      // Fetch recent stock updates
      const { data: updatesData, error: updatesError } = await supabase
        .from('stock_updates')
        .select(`
          id,
          previous_stock,
          actual_stock,
          update_date,
          products!inner(name, sku)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (updatesError) throw updatesError;
      setRecentUpdates(updatesData || []);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch stock data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (stock <= 10) return { label: 'Low Stock', variant: 'secondary' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  const lowStockProducts = filteredProducts.filter(p => p.current_stock <= 10);
  const outOfStockProducts = filteredProducts.filter(p => p.current_stock === 0);

  if (loading) {
    return <div>Loading stock overview...</div>;
  }

  return (
    <div className="space-y-8 p-4 md:p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Stock Overview</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-4 md:mt-0 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg w-full sm:w-auto">
            <Filter className="h-4 w-4" />
            <Select 
              value={selectedCategory}
              onValueChange={filterProductsByCategory}
            >
              <SelectTrigger className="w-full sm:w-48 bg-transparent border-0 text-white focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Filter by category" className="text-white" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a category</SelectItem>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <div className="p-2 rounded-full bg-purple-100 text-purple-600">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              {selectedCategory && selectedCategory !== 'all' 
                ? `In ${categories.find(c => c.id === selectedCategory)?.name || 'selected category'}` 
                : 'Across all categories'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <div className="p-2 rounded-full bg-amber-100 text-amber-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <div className="p-2 rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
            <CardTitle className="text-xl font-bold text-indigo-800">Current Stock Levels</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile list view */}
            <div className="sm:hidden divide-y">
              {paginatedProducts.map((product) => {
                const status = getStockStatus(product.current_stock);
                return (
                  <div key={product.id} className="p-4 flex flex-col gap-2">
                    <div className="text-base font-medium">{product.name}</div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>SKU: {product.sku}</span>
                      <span>Stock: {product.current_stock}</span>
                    </div>
                    <div>
                      <Badge 
                        variant={status.variant}
                        className={`${
                          status.variant === 'destructive' ? 'bg-red-100 text-red-800' : 
                          status.variant === 'secondary' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}
                      >
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {products.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">No products found</div>
              )}
            </div>

            {/* Desktop/tablet table view */}
            <div className="hidden sm:block overflow-x-auto">
              <Table className="min-w-full divide-y divide-gray-200 text-sm">
                <TableHeader>
                  <TableRow className="hover:bg-blue-50 transition-colors duration-150">
                    <TableHead className="whitespace-nowrap">Product</TableHead>
                    <TableHead className="whitespace-nowrap">SKU</TableHead>
                    <TableHead className="whitespace-nowrap">Stock</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => {
                    const status = getStockStatus(product.current_stock);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{product.sku}</TableCell>
                        <TableCell className="whitespace-nowrap">{product.current_stock}</TableCell>
                        <TableCell>
                          <Badge 
                          variant={status.variant} 
                          className={`px-2.5 py-0.5 text-xs font-medium ${
                            status.variant === 'destructive' ? 'bg-red-100 text-red-800' : 
                            status.variant === 'secondary' ? 'bg-amber-100 text-amber-800' :
                            'bg-green-100 text-green-800'
                          }`}
                        >
                          {status.label}
                        </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {products.length === 0 && (
                    <TableRow className="hover:bg-blue-50 transition-colors duration-150">
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No products found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {products.length > 0 && (
              <div className="p-4 border-t">
                <PaginationControls
                  currentPage={productsCurrentPage}
                  totalPages={productsTotalPages}
                  onPageChange={goToProductsPage}
                  canGoNext={productsCanGoNext}
                  canGoPrevious={productsCanGoPrevious}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
            <CardTitle className="text-xl font-bold text-indigo-800">Recent Stock Updates</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile list view */}
            <div className="sm:hidden divide-y">
              {paginatedUpdates.map((update) => (
                <div key={update.id} className="p-4 flex flex-col gap-1">
                  <div className="text-base font-medium">{update.products.name}</div>
                  <div className="text-xs text-gray-500">{update.products.sku}</div>
                  <div className="flex items-center justify-between text-sm">
                    <span>From</span>
                    <span className="font-semibold">{update.previous_stock}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>To</span>
                    <span className="font-semibold">{update.actual_stock}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Date</span>
                    <span>{new Date(update.update_date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {recentUpdates.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <AlertTriangle className="h-12 w-12 text-gray-400" />
                    <p className="text-lg font-medium">No stock updates found</p>
                    <p className="text-sm">Stock updates will appear here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop/tablet table view */}
            <div className="hidden sm:block overflow-x-auto">
              <Table className="min-w-full divide-y divide-gray-200 text-sm">
                <TableHeader>
                  <TableRow className="hover:bg-blue-50 transition-colors duration-150">
                    <TableHead className="whitespace-nowrap">Product</TableHead>
                    <TableHead className="whitespace-nowrap">From</TableHead>
                    <TableHead className="whitespace-nowrap">To</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUpdates.map((update) => (
                    <TableRow key={update.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{update.products.name}</div>
                          <div className="text-xs text-gray-500">{update.products.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{update.previous_stock}</TableCell>
                      <TableCell className="whitespace-nowrap">{update.actual_stock}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(update.update_date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentUpdates.length === 0 && (
                    <TableRow className="hover:bg-blue-50 transition-colors duration-150">
                      <TableCell colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <AlertTriangle className="h-12 w-12 text-gray-400" />
                          <p className="text-lg font-medium">No stock updates found</p>
                          <p className="text-sm">Stock updates will appear here</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {recentUpdates.length > 0 && (
              <div className="p-4 border-t">
                <PaginationControls
                  currentPage={updatesCurrentPage}
                  totalPages={updatesTotalPages}
                  onPageChange={goToUpdatesPage}
                  canGoNext={updatesCanGoNext}
                  canGoPrevious={updatesCanGoPrevious}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}