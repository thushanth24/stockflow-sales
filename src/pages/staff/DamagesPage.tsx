import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  sku: string;
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

export default function DamagesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [damages, setDamages] = useState<Damage[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    reason: '',
    damage_date: new Date().toISOString().split('T')[0],
  });
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('damages')
        .insert([{
          product_id: formData.product_id,
          quantity: parseInt(formData.quantity),
          reason: formData.reason,
          damage_date: formData.damage_date,
          created_by: user?.id,
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Damage report submitted successfully',
      });

      setFormData({
        product_id: '',
        quantity: '',
        reason: '',
        damage_date: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Report Damage</h1>
        <p className="text-muted-foreground">Log damaged items to exclude from sales calculations</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Report Damaged Items</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity Damaged</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Damage</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Describe what happened (e.g., dropped, expired, broken)"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="damage_date">Date of Damage</Label>
                <Input
                  id="damage_date"
                  type="date"
                  value={formData.damage_date}
                  onChange={(e) => setFormData({ ...formData, damage_date: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Report Damage
              </Button>
            </form>
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
                {damages.map((damage) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}