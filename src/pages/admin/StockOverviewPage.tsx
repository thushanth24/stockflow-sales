import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Package, AlertTriangle, TrendingDown, Filter, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { generateCategoryStockPDF, downloadPDF, exportToExcel } from '@/lib/categoryPdfUtils';

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

  const handleExportCategoryPDF = async () => {
    if (selectedCategory === 'none') {
      toast({
        title: 'Please select a category',
        description: 'You need to select a category to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      let productsToExport: any[] = [];
      let exportName = '';

      if (selectedCategory === 'all') {
        // Export all categories
        productsToExport = [...products];
        exportName = 'All_Categories';
      } else {
        // Export specific category
        const category = categories.find(cat => cat.id === selectedCategory);
        if (!category) return;
        
        productsToExport = products.filter(
          product => product.category_id === selectedCategory
        );
        exportName = category.name;
      }

      // Generate and download PDF
      const doc = generateCategoryStockPDF(
        selectedCategory === 'all' ? 'All Categories' : exportName,
        productsToExport.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          current_stock: p.current_stock,
          category_name: p.categories?.name || 'Uncategorized'
        }))
      );
      
      downloadPDF(doc, `stock_report_${exportName.toLowerCase().replace(/\s+/g, '_')}`);
      
      toast({
        title: 'PDF Exported',
        description: `Stock report ${selectedCategory === 'all' ? 'for all categories' : `for ${exportName}`} has been exported successfully.`,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExportCategoryExcel = async () => {
    if (selectedCategory === 'none') {
      toast({
        title: 'Please select a category',
        description: 'You need to select a category to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      let productsToExport: any[] = [];
      let exportName = '';

      if (selectedCategory === 'all') {
        // Export all categories
        productsToExport = [...products];
        exportName = 'All_Categories';
      } else {
        // Export specific category
        const category = categories.find(cat => cat.id === selectedCategory);
        if (!category) return;
        
        productsToExport = products.filter(
          product => product.category_id === selectedCategory
        );
        exportName = category.name;
      }

      // Prepare products data for export
      const productsForExport = productsToExport.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        current_stock: p.current_stock,
        category_name: p.categories?.name || 'Uncategorized'
      }));

      // Export to Excel
      exportToExcel(
        selectedCategory === 'all' ? 'All Categories' : exportName,
        productsForExport,
        `stock_report_${exportName.toLowerCase().replace(/\s+/g, '_')}`
      );
      
      toast({
        title: 'Excel Exported',
        description: `Stock report ${selectedCategory === 'all' ? 'for all categories' : `for ${exportName}`} has been exported successfully.`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Error',
        description: 'Failed to export to Excel. Please try again.',
        variant: 'destructive',
      });
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
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          {/* Header Skeleton */}
          <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl h-28">
            <div className="h-8 bg-blue-500/30 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-blue-500/30 rounded w-1/2 max-w-md"></div>
          </div>
          
          {/* Filter Skeleton */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="h-10 bg-gray-100 rounded-md w-64"></div>
          </div>
          
          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-8 w-8 bg-gray-100 rounded-full"></div>
                </div>
                <div className="h-6 bg-gray-100 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          
          {/* Stock Levels Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
            
            {/* Table Header Skeleton */}
            <div className="hidden sm:grid grid-cols-4 gap-4 mb-4">
              {['Product', 'SKU', 'Stock', 'Status'].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
            
            {/* Table Rows Skeleton */}
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 border-b">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/2 sm:hidden"></div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="h-6 bg-gray-100 rounded-full w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Recent Updates Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
            
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-full w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Stock Overview</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-4 md:mt-0 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg w-full sm:w-auto">
            <Filter className="h-4 w-4 text-white" />
            <Select 
              value={selectedCategory}
              onValueChange={filterProductsByCategory}
            >
              <SelectTrigger className="w-full sm:w-48 bg-white/10 border-0 text-white hover:bg-white/20 focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="none">No Filter</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                onClick={handleExportCategoryPDF}
                disabled={selectedCategory === 'none'}
                title={selectedCategory === 'none' 
                  ? 'Select a category to export' 
                  : `Export ${selectedCategory === 'all' ? 'all categories' : categories.find(c => c.id === selectedCategory)?.name} to PDF`}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-green-500/10 hover:bg-green-500/20 text-green-100 border-green-500/20"
                onClick={handleExportCategoryExcel}
                disabled={selectedCategory === 'none'}
                title={selectedCategory === 'none'
                  ? 'Select a category to export' 
                  : `Export ${selectedCategory === 'all' ? 'all categories' : categories.find(c => c.id === selectedCategory)?.name} to Excel`}
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
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
                      {selectedCategory === 'none' && <span>SKU: {product.sku}</span>}
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
                    {selectedCategory === 'none' && <TableHead className="whitespace-nowrap">SKU</TableHead>}
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
                        {selectedCategory === 'none' && <TableCell className="whitespace-nowrap">{product.sku}</TableCell>}
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