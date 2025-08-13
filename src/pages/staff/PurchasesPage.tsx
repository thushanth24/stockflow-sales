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
import { Trash2 } from 'lucide-react';

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
    setPurchaseEntries([]);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Purchases</h1>
        <p className="text-muted-foreground">Log new stock arrivals for multiple products</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Multiple Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Purchase Date</Label>
              <Input
                id="purchase_date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-48"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Purchase Items</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter quantities for products you want to purchase
                  </p>
                </div>
                <Select value={selectedCategory} onValueChange={filterProductsByCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-32">Current Stock</TableHead>
                      <TableHead className="w-40">Quantity to Add</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.sku}
                              {product.categories?.name && (
                                <span> • {product.categories.name}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{product.current_stock}</div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={purchaseEntries[product.id] || ''}
                              onChange={(e) => updatePurchaseQuantity(
                                product.id,
                                parseInt(e.target.value) || 0
                              )}
                              className="w-24"
                              placeholder="0"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                          No products found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button 
                  type="button" 
                  onClick={handleSubmit}
                  disabled={submitting || Object.values(purchaseEntries).every(qty => !qty)}
                >
                  {submitting ? 'Processing...' : 'Save Purchases'}
                </Button>
              </div>

              {purchaseEntries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No purchase items added yet. Click "Add Product" to start.
                </div>
              )}

              {purchaseEntries.length > 0 && (
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    size="lg"
                  >
                    {submitting ? 'Logging Purchases...' : 'Log All Purchases'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>
                    {purchase.products.name}
                    <div className="text-sm text-muted-foreground">
                      {purchase.products.sku}
                    </div>
                  </TableCell>
                  <TableCell>{purchase.quantity}</TableCell>
                  <TableCell>
                    {new Date(purchase.purchase_date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {purchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No purchases logged yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}