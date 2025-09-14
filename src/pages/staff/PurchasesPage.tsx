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
import { Loader2, Package, Plus, ShoppingCart, Trash2, Edit2 } from 'lucide-react';

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
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
      
      // Fetch paginated data with product details
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          products (name, sku)
        `)
        .order('created_at', { ascending: false })
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

  const loadPurchaseForEditing = async (purchaseId: string) => {
    try {
      setSubmitting(true);
      
      // First, get the purchase date of the selected purchase
      const { data: selectedPurchase, error: purchaseError } = await supabase
        .from('purchases')
        .select('purchase_date')
        .eq('id', purchaseId)
        .single();

      if (purchaseError) throw purchaseError;
      
      if (!selectedPurchase) {
        throw new Error('Purchase not found');
      }
      
      // Get all purchases made at the same time (same purchase_date)
      const { data: purchaseData, error: purchasesError } = await supabase
        .from('purchases')
        .select('*, products(*)')
        .eq('purchase_date', selectedPurchase.purchase_date)
        .order('created_at', { ascending: false });
        
      if (purchasesError) throw purchasesError;
      
      if (!purchaseData || purchaseData.length === 0) {
        throw new Error('No purchases found');
      }
      
      // Create entries for all products in this purchase
      const entries = {};
      purchaseData.forEach(purchase => {
        if (purchase.product_id) {
          entries[purchase.product_id] = purchase.quantity;
        }
      });
      
      // Set the form state
      setPurchaseDate(selectedPurchase.purchase_date);
      setPurchaseEntries(entries);
      setEditingPurchaseId(purchaseId);
      setIsEditMode(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load purchase for editing',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPurchaseEntries({});
    setIsEditMode(false);
    setEditingPurchaseId(null);
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
      if (isEditMode && editingPurchaseId) {
        // Get the original purchase date to find all related purchases
        const { data: originalPurchase, error: fetchError } = await supabase
          .from('purchases')
          .select('purchase_date')
          .eq('id', editingPurchaseId)
          .single();

        if (fetchError) throw fetchError;
        
        if (!originalPurchase) {
          throw new Error('Original purchase not found');
        }
        
        // Get all original purchases made at the same time
        const { data: originalPurchases, error: fetchAllError } = await supabase
          .from('purchases')
          .select('id, product_id, quantity')
          .eq('purchase_date', originalPurchase.purchase_date);
          
        if (fetchAllError) throw fetchAllError;
        
        if (!originalPurchases || originalPurchases.length === 0) {
          throw new Error('No original purchases found');
        }
        
        // Create a map of product_id to original purchase for easy lookup
        const originalPurchasesMap = new Map(
          originalPurchases.map(p => [p.product_id, p])
        );
        
        // First, update all existing purchases and calculate stock differences
        for (const entry of validEntries) {
          const originalPurchase = originalPurchasesMap.get(entry.product_id);
          
          if (originalPurchase) {
            // Update existing purchase
            const { error: updateError } = await supabase
              .from('purchases')
              .update({
                quantity: entry.quantity,
                purchase_date: purchaseDate
              })
              .eq('id', originalPurchase.id);
              
            if (updateError) throw updateError;
            
            // Calculate stock difference
            const quantityDifference = entry.quantity - originalPurchase.quantity;
            
            // Update product stock
            const { data: product } = await supabase
              .from('products')
              .select('current_stock')
              .eq('id', entry.product_id)
              .single();
              
            if (product) {
              await supabase
                .from('products')
                .update({ current_stock: product.current_stock + quantityDifference })
                .eq('id', entry.product_id);
            }
          } else {
            // This is a new product being added to the purchase
            const { error: insertError } = await supabase
              .from('purchases')
              .insert([{
                product_id: entry.product_id,
                quantity: entry.quantity,
                purchase_date: purchaseDate,
                created_by: user?.id
              }]);
              
            if (insertError) throw insertError;
            
            // Update product stock for new item
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
        }
        
        // Handle case where products were removed from the purchase
        const updatedProductIds = validEntries.map(e => e.product_id);
        const purchasesToDelete = originalPurchases.filter(
          p => !updatedProductIds.includes(p.product_id)
        );
        
        // Delete purchases that were removed
        for (const purchase of purchasesToDelete) {
          // First, adjust the product stock
          const { data: product } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', purchase.product_id)
            .single();
            
          if (product) {
            await supabase
              .from('products')
              .update({ current_stock: product.current_stock - purchase.quantity })
              .eq('id', purchase.product_id);
          }
          
          // Then delete the purchase record
          await supabase
            .from('purchases')
            .delete()
            .eq('id', purchase.id);
        }

        toast({
          title: 'Success',
          description: 'Purchase updated successfully',
        });
      } else {
        // Create new purchase records
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
      }

      // Reset form and refresh data
      resetForm();
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
              {/* Date Picker Skeleton */}
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-32"></div>
                <div className="h-10 bg-gray-100 rounded-md w-64"></div>
              </div>
              
              {/* Search and Filter Skeleton */}
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-24"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-10 bg-gray-100 rounded-md"></div>
                  <div className="h-10 bg-gray-100 rounded-md"></div>
                </div>
              </div>
              
              {/* Table Skeleton */}
              <div className="space-y-4">
                <div className="h-5 bg-gray-200 rounded w-32"></div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="grid grid-cols-4 gap-4">
                      <div className="h-10 bg-gray-100 rounded-md"></div>
                      <div className="h-10 bg-gray-100 rounded-md"></div>
                      <div className="h-10 bg-gray-100 rounded-md"></div>
                      <div className="h-10 bg-gray-100 rounded-md"></div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Pagination Skeleton */}
              <div className="flex justify-between items-center pt-4">
                <div className="h-8 bg-gray-100 rounded-md w-32"></div>
                <div className="flex space-x-2">
                  <div className="h-8 w-8 bg-gray-100 rounded-md"></div>
                  <div className="h-8 w-8 bg-gray-100 rounded-md"></div>
                  <div className="h-8 w-8 bg-gray-100 rounded-md"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-4 flex-1 overflow-y-auto space-y-4 md:space-y-6" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 p-3 md:p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white shadow-sm">
        <div className="w-full sm:w-auto">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight break-words">Purchase Management</h1>
        </div>
      </div>

      <Card className="border shadow-sm overflow-hidden">

        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
              <div className="space-y-2">
                <Label htmlFor="purchase_date" className="text-sm font-medium text-gray-700">Purchase Date</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-full sm:w-48">
                    <Input
                      id="purchase_date"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md shadow-sm"
                    />
                  </div>
                  <span className="text-sm text-gray-500 text-center sm:text-left">
                    {new Date(purchaseDate).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col space-y-4">
                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">Purchase Items</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="w-full">
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base"
                          />
                        </div>
                      </div>
                      <div className="w-full">
                        <Select value={selectedCategory} onValueChange={filterProductsByCategory}>
                          <SelectTrigger className="w-full border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base">
                            <SelectValue placeholder="Filter by category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="focus:bg-blue-50 text-sm">All Categories</SelectItem>
                            {categories.map((category) => (
                              <SelectItem 
                                key={category.id} 
                                value={category.id}
                                className="focus:bg-blue-50 text-sm"
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</TableHead>
                        <TableHead className="px-4 py-2.5 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Current Stock</TableHead>
                        <TableHead className="px-4 py-2.5 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity to Add</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <TableRow 
                            key={product.id}
                            className="hover:bg-blue-50 transition-colors duration-150"
                          >
                            <TableCell className="px-4 py-2.5 whitespace-nowrap">
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
                            <TableCell className="px-4 py-2.5 whitespace-nowrap text-right">
                              <div className="flex justify-end">
                                <Input
                                  type="number"
                                  min="0"
                                  value={purchaseEntries[product.id] || ''}
                                  onChange={(e) => updatePurchaseQuantity(
                                    product.id,
                                    parseInt(e.target.value) || 0
                                  )}
                                  className="w-28 h-9 text-right border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                  placeholder="0"
                                />
                              </div>
                            </TableCell>
                           
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="px-4 py-8 text-center">
                            <div className="flex flex-col items-center justify-center space-y-1.5">
                              <Package className="h-8 w-8 text-gray-400" />
                              <h3 className="text-sm font-medium text-gray-700">No products found</h3>
                              <p className="text-xs text-gray-500">
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
                      <div key={product.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{product.name}</h4>
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
                              className="w-24 h-9 text-center"
                              placeholder="0"
                            />
                          </div>
            
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
                      <Package className="h-8 w-8 text-gray-400 mx-auto" />
                      <h3 className="mt-2 text-sm font-medium text-gray-700">No products found</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {selectedCategory === 'all' 
                          ? 'No products available. Add products first.'
                          : 'No products in this category. Try another filter.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || Object.values(purchaseEntries).every(qty => !qty)}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base h-9 sm:h-10 px-4"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="whitespace-nowrap">Processing...</span>
                    </>
                  ) : isEditMode ? (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Update Purchase</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">Complete Purchase</span>
                    </>
                  )}
                </Button>
                
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={submitting}
                    className="w-full sm:w-auto"
                  >
                    Cancel Edit
                  </Button>
                )}
                
                {!isEditMode && purchases.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadPurchaseForEditing(purchases[0].id)}
                    disabled={submitting}
                    className="w-full sm:w-auto bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200"
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit Last Purchase
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
