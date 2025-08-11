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
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseEntries, setPurchaseEntries] = useState<PurchaseEntry[]>([]);
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
    if (categoryId === '') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(product => product.category_id === categoryId));
    }
  };

  const addPurchaseEntry = () => {
    setPurchaseEntries([...purchaseEntries, { product_id: '', quantity: 0 }]);
  };

  const removePurchaseEntry = (index: number) => {
    setPurchaseEntries(purchaseEntries.filter((_, i) => i !== index));
  };

  const updatePurchaseEntry = (index: number, field: keyof PurchaseEntry, value: string | number) => {
    const updated = [...purchaseEntries];
    updated[index] = { ...updated[index], [field]: value };
    setPurchaseEntries(updated);
  };

  const handleSubmit = async () => {
    if (purchaseEntries.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one purchase entry',
        variant: 'destructive',
      });
      return;
    }

    const validEntries = purchaseEntries.filter(entry => 
      entry.product_id && entry.quantity > 0
    );

    if (validEntries.length === 0) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields with valid quantities',
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

      setPurchaseEntries([]);
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
                <h3 className="text-lg font-medium">Purchase Items</h3>
                <div className="flex gap-2">
                  <Select value={selectedCategory} onValueChange={filterProductsByCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addPurchaseEntry} variant="outline">
                    Add Product
                  </Button>
                </div>
              </div>

              {purchaseEntries.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseEntries.map((entry, index) => {
                      const selectedProduct = products.find(p => p.id === entry.product_id);
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Select 
                              value={entry.product_id} 
                              onValueChange={(value) => updatePurchaseEntry(index, 'product_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredProducts.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.sku})
                                    {product.categories?.name && (
                                      <span className="text-muted-foreground"> - {product.categories.name}</span>
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {selectedProduct ? selectedProduct.current_stock : '-'}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={entry.quantity || ''}
                              onChange={(e) => updatePurchaseEntry(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePurchaseEntry(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

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