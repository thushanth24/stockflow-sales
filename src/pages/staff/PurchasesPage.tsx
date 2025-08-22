import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, Plus, ShoppingCart, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  selling_price?: number;
  category_id: string | null;
  categories?: {
    name: string;
  };
  category_name?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Purchase {
  id: string;
  quantity: number;
  purchase_date: string;
  products: {
    name: string;
    sku: string;
  };
}

interface PurchaseEntry {
  product_id: string;
  quantity: number;
}

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseEntries, setPurchaseEntries] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch products with categories
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, current_stock, category_id, categories(name)')
        .order('name');

      if (productsError) throw productsError;
      const productsList = productsData || [];
      setProducts(productsList);
      
      // Initially show all products, will be filtered when categories are loaded
      setFilteredProducts(productsList);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (categoriesError) throw categoriesError;
      const categoriesList = categoriesData || [];
      setCategories(categoriesList);
      
      // Set the first category as default if available
      if (categoriesList.length > 0) {
        setSelectedCategory(categoriesList[0].id);
      }

      // Fetch recent purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select(`
          id,
          quantity,
          purchase_date,
          products!inner(name, sku)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (purchasesError) throw purchasesError;
      setPurchases(purchasesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      
      // Get total count
      const { count, error: countError } = await supabase
        .from('purchases')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      setTotalItems(count || 0);
      
      // Calculate range for pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      // Fetch paginated data
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          products (name, sku)
        `)
        .order('purchase_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setPurchases(data || []);
    } catch (err) {
      console.error('Error fetching purchases:', err);
      toast({
        title: 'Error',
        description: 'Failed to load purchase history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };

  const filterProductsByCategory = (categoryId: string) => {
    if (!categoryId) return;
    setSelectedCategory(categoryId);
    applyFilters(categoryId, searchTerm);
  };

  const applyFilters = (categoryId: string, search: string) => {
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(selectedCategory, value);
  };
  
  // Update filtered products when categories, products, or search term changes
  useEffect(() => {
    if (products.length > 0) {
      applyFilters(selectedCategory, searchTerm);
    }
  }, [selectedCategory, products, searchTerm]);

  const updatePurchaseQuantity = (productId: string, quantity: number) => {
    setPurchaseEntries(prev => ({
      ...prev,
      [productId]: quantity
    }));
  };

  const handleSubmit = async () => {
    const validEntries = Object.entries(purchaseEntries)
      .filter(([_, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({
        product_id: productId,
        quantity: Number(quantity)
      }));

    if (validEntries.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add quantities for at least one product',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    
    try {
      // Insert all purchase records
      const purchaseRecords = validEntries.map(entry => ({
        product_id: entry.product_id,
        quantity: entry.quantity,
        purchase_date: purchaseDate,
        created_by: user?.id,
      }));

      const { error } = await supabase
        .from('purchases')
        .insert(purchaseRecords);

      if (error) throw error;

      // Update product current stock for each product
      for (const entry of validEntries) {
        const { data: product } = await supabase
          .from('products')
          .select('current_stock')
          .eq('id', entry.product_id)
          .single();

        if (product) {
          await supabase
            .from('products')
            .update({ current_stock: product.current_stock + entry.quantity })
            .eq('id', entry.product_id);
        }
      }

      toast({
        title: 'Success',
        description: `${validEntries.length} purchase(s) logged successfully`,
      });

      // Reset quantities
      setPurchaseEntries({});
      // Refresh data
      fetchData();
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
    return <div>Loading...</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 sm:p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Purchase Management</h1>
        </div>
        <Button 
          className="mt-2 sm:mt-0 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-md transition-all hover:scale-105 text-sm sm:text-base"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Log New Purchase
        </Button>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">

        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="space-y-2">
                <Label htmlFor="purchase_date" className="text-sm font-medium text-gray-700">Purchase Date</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="purchase_date"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-48 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm"
                  />
                  <span className="text-sm text-gray-500">
                    {new Date(purchaseDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">Purchase Items</h3>
                  <div className="w-full md:w-64">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      {!searchTerm && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                   
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-auto">
                  <Select value={selectedCategory} onValueChange={filterProductsByCategory}>
                    <SelectTrigger className="w-full md:w-64 border-gray-300 focus:ring-blue-500 focus:border-blue-500">
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
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</TableHead>
                        <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Current Stock</TableHead>
                        <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity to Add</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <TableRow 
                            key={product.id}
                            className="hover:bg-blue-50 transition-colors duration-150"
                          >
                            <TableCell className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full ${
                                product.current_stock > 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {product.current_stock} in stock
                              </span>
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end">
                                <Input
                                  type="number"
                                  min="0"
                                  value={purchaseEntries[product.id] || ''}
                                  onChange={(e) => updatePurchaseQuantity(
                                    product.id,
                                    parseInt(e.target.value) || 0
                                  )}
                                  className="w-32 text-right border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                  placeholder="0"
                                />
                              </div>
                            </TableCell>
                           
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <Package className="h-12 w-12 text-gray-400" />
                              <h3 className="text-lg font-medium text-gray-700">No products found</h3>
                              <p className="text-sm text-gray-500">
                                {selectedCategory === 'all' 
                                  ? 'No products available. Add products first.'
                                  : 'No products in this category. Try another filter.'}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Mobile View */}
                <div className="md:hidden space-y-3 mt-4">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <div key={product.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{product.name}</h4>
                            <div className="mt-1">
                              <span className={`px-2 py-0.5 inline-flex text-xs font-medium rounded-full ${
                                product.current_stock > 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {product.current_stock} in stock
                              </span>
                            </div>
                          </div>
                         
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <label htmlFor={`qty-${product.id}`} className="block text-sm font-medium text-gray-700">
                              Quantity
                            </label>
                            <Input
                              id={`qty-${product.id}`}
                              type="number"
                              min="0"
                              value={purchaseEntries[product.id] || ''}
                              onChange={(e) => updatePurchaseQuantity(
                                product.id,
                                parseInt(e.target.value) || 0
                              )}
                              className="w-24 text-center"
                              placeholder="0"
                            />
                          </div>
            
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
                      <Package className="h-12 w-12 text-gray-400 mx-auto" />
                      <h3 className="mt-2 text-lg font-medium text-gray-700">No products found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedCategory === 'all' 
                          ? 'No products available. Add products first.'
                          : 'No products in this category. Try another filter.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || Object.values(purchaseEntries).every(qty => !qty)}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Complete Purchase
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl sm:text-2xl font-bold text-indigo-800">
              Recent Purchases
            </CardTitle>
            {totalItems > 0 && (
              <div className="text-sm text-indigo-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} purchases
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table className="min-w-full divide-y divide-gray-200">
              <TableHeader className="bg-gray-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white divide-y divide-gray-200">
                {purchases.length > 0 ? (
                  purchases.map((purchase) => (
                    <TableRow 
                      key={purchase.id}
                      className="hover:bg-blue-50 transition-colors duration-150"
                    >
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{purchase.products.name}</div>
                      
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          +{purchase.quantity} added
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {new Date(purchase.purchase_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package className="h-12 w-12 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-700">No purchase history</h3>
                        <p className="text-sm text-gray-500">
                          Log your first purchase to see it here
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {purchases.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{purchase.products.name}</h4>
                        <div className="mt-1 flex items-center space-x-2">
                      
                          <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            +{purchase.quantity} added
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {new Date(purchase.purchase_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(purchase.purchase_date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto" />
                <h3 className="mt-2 text-lg font-medium text-gray-700">No purchase history</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Log your first purchase to see it here
                </p>
              </div>
            )}
          </div>
          
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-200 gap-4">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm"
                >
                  Previous
                </Button>
                
                {getPageNumbers().map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 text-sm ${currentPage === page ? 'bg-indigo-600 text-white' : ''}`}
                  >
                    {page}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm"
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm"
                >
                  Last
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                {itemsPerPage} per page
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}