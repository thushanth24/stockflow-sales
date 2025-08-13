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
import { Trash2, Plus, Package } from 'lucide-react';

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
  const [purchaseEntries, setPurchaseEntries] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
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
      setProducts(productsData || []);
      setFilteredProducts(productsData || []);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

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

  const filterProductsByCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(product => product.category_id === categoryId));
    }
    // Reset the purchase entries to avoid showing products from previous category
    setPurchaseEntries({});
  };

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
    <div className="space-y-8 p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Purchase Management</h1>
        </div>
        <Button 
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-md transition-all hover:scale-105"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <Plus className="mr-2 h-5 w-5" />
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Purchase Items</h3>
                
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
                                <div className="text-sm text-gray-500 flex items-center space-x-2">
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                    {product.sku}
                                  </span>
                                  {product.categories?.name && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                                      {product.categories.name}
                                    </span>
                                  )}
                                </div>
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
                        <TableCell colSpan={3} className="px-6 py-12 text-center">
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

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {Object.keys(purchaseEntries).length > 0 ? (
                    <span>
                      {Object.values(purchaseEntries).filter(qty => qty > 0).length} item(s) selected
                    </span>
                  ) : (
                    <span className="text-gray-500">No items selected yet</span>
                  )}
                </div>
                <Button 
                  onClick={handleSubmit}
                  disabled={submitting || Object.values(purchaseEntries).every(qty => !qty)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  size="lg"
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
                    'Save All Purchases'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <CardTitle className="text-2xl font-bold text-indigo-800">Recent Purchases</CardTitle>
          <p className="text-sm text-indigo-600">Track your latest inventory additions</p>
        </CardHeader>
        <CardContent className="p-0">
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
                      <div className="text-sm text-gray-500">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                          {purchase.products.sku}
                        </span>
                      </div>
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
          
          {purchases.length > 0 && (
            <div className="flex justify-end px-6 py-4 bg-gray-50 border-t border-gray-200">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // TODO: Implement view all purchases
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                View All Purchases
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}