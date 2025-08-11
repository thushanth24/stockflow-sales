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
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [stockUpdates, setStockUpdates] = useState<StockUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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
      
      setProducts(data || []);
      setFilteredProducts(data || []);
      // Initialize stock updates with current stock
      setStockUpdates(
        (data || []).map(product => ({
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

  const filterProductsByCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === '') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(product => product.category_id === categoryId));
    }
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
    return <div>Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Daily Stock Update</h1>
        <p className="text-muted-foreground">
          Update actual stock counts to calculate daily sales
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Count Update</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Enter actual stock counts for accurate sales calculation
              </p>
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
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Actual Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const stockUpdate = stockUpdates.find(u => u.product_id === product.id);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>
                        {product.categories?.name || (
                          <span className="text-muted-foreground">No category</span>
                        )}
                      </TableCell>
                      <TableCell>{product.current_stock}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={stockUpdate?.actual_stock || 0}
                          onChange={(e) => updateStockCount(
                            product.id,
                            parseInt(e.target.value) || 0
                          )}
                          className="w-24"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {selectedCategory ? "No products in this category" : "No products found. Add products first."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {products.length > 0 && (
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  size="lg"
                >
                  {submitting ? 'Updating Stock...' : 'Update All Stock Counts'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Enter the actual count of each product at the end of the day</p>
            <p>• The system will automatically calculate sales using the formula:</p>
            <p className="font-mono bg-muted p-2 rounded">
              Sales = (Previous Stock + Purchases) - (Current Stock + Damages)
            </p>
            <p>• This ensures accurate sales tracking without manual entry</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}