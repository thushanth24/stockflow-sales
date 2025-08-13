import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

interface Product {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
}

interface Damage {
  id: string;
  quantity: number;
  reason: string;
  damage_date: string;
  products: {
    name: string;
    sku: string;
  };
}

interface DamageEntry {
  product_id: string;
  quantity: number;
  reason: string;
}

export default function DamagesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [damages, setDamages] = useState<Damage[]>([]);
  const [damageEntries, setDamageEntries] = useState<DamageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [damageDate, setDamageDate] = useState(new Date().toISOString().split('T')[0]);
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    currentData: paginatedDamages,
    currentPage,
    totalPages,
    goToPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ data: damages, itemsPerPage: 10 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, current_stock')
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Fetch recent damages
      const { data: damagesData, error: damagesError } = await supabase
        .from('damages')
        .select(`
          id,
          quantity,
          reason,
          damage_date,
          products!inner(name, sku)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (damagesError) throw damagesError;
      setDamages(damagesData || []);
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

  const addDamageEntry = () => {
    setDamageEntries([...damageEntries, { product_id: '', quantity: 0, reason: '' }]);
  };

  const removeDamageEntry = (index: number) => {
    setDamageEntries(damageEntries.filter((_, i) => i !== index));
  };

  const updateDamageEntry = (index: number, field: keyof DamageEntry, value: string | number) => {
    const updated = [...damageEntries];
    updated[index] = { ...updated[index], [field]: value };
    setDamageEntries(updated);
  };

  const handleSubmit = async () => {
    if (damageEntries.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one damage entry',
        variant: 'destructive',
      });
      return;
    }

    const validEntries = damageEntries.filter(entry => 
      entry.product_id && entry.quantity > 0 && entry.reason.trim()
    );

    if (validEntries.length === 0) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields for at least one entry',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    
    try {
      // Insert all damage records
      const damageRecords = validEntries.map(entry => ({
        product_id: entry.product_id,
        quantity: entry.quantity,
        reason: entry.reason,
        damage_date: damageDate,
        created_by: user?.id,
      }));

      const { error } = await supabase
        .from('damages')
        .insert(damageRecords);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${validEntries.length} damage report(s) submitted successfully`,
      });

      setDamageEntries([]);
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
        <h1 className="text-3xl font-bold">Report Damages</h1>
        <p className="text-muted-foreground">Log damaged items for multiple products</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Multiple Damages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="damage_date">Damage Date</Label>
              <Input
                id="damage_date"
                type="date"
                value={damageDate}
                onChange={(e) => setDamageDate(e.target.value)}
                className="w-48"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Damaged Items</h3>
                <Button type="button" onClick={addDamageEntry} variant="outline">
                  Add Product
                </Button>
              </div>

              {damageEntries.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {damageEntries.map((entry, index) => {
                      const selectedProduct = products.find(p => p.id === entry.product_id);
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <select
                              className="w-full p-2 border rounded"
                              value={entry.product_id}
                              onChange={(e) => updateDamageEntry(index, 'product_id', e.target.value)}
                            >
                              <option value="">Select a product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({product.sku})
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            {selectedProduct ? selectedProduct.current_stock : '-'}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={entry.quantity || ''}
                              onChange={(e) => updateDamageEntry(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={entry.reason}
                              onChange={(e) => updateDamageEntry(index, 'reason', e.target.value)}
                              placeholder="Reason for damage"
                              className="min-h-[60px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDamageEntry(index)}
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

              {damageEntries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No damage entries added yet. Click "Add Product" to start.
                </div>
              )}

              {damageEntries.length > 0 && (
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    size="lg"
                  >
                    {submitting ? 'Submitting Reports...' : 'Submit All Damage Reports'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Damage Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDamages.map((damage) => (
                <TableRow key={damage.id}>
                  <TableCell>
                    {damage.products.name}
                    <div className="text-sm text-muted-foreground">
                      {damage.products.sku}
                    </div>
                  </TableCell>
                  <TableCell>{damage.quantity}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={damage.reason}>
                    {damage.reason}
                  </TableCell>
                  <TableCell>
                    {new Date(damage.damage_date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {damages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No damage reports yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {damages.length > 0 && (
            <div className="mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                canGoNext={canGoNext}
                canGoPrevious={canGoPrevious}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}