import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

interface Product {
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

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    category_id: 'none',
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    currentData: paginatedProducts,
    currentPage,
    totalPages,
    goToPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ data: products, itemsPerPage: 10 });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        price: parseFloat(formData.price),
        category_id: formData.category_id === 'none' ? null : formData.category_id || null,
        created_by: user?.id,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Product created successfully',
        });
      }

      setFormData({ name: '', sku: '', price: '', category_id: 'none' });
      setEditingProduct(null);
      setDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.price.toString(),
      category_id: product.category_id || 'none',
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', price: '', category_id: 'none' });
    setDialogOpen(true);
  };

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="space-y-8 p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Products</h1>
          <p className="text-blue-100">Manage your inventory products with ease</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={openCreateDialog}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-md transition-all hover:scale-105"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-xl border-0 shadow-2xl bg-gradient-to-b from-white to-gray-50">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <CardTitle className="text-2xl font-bold text-indigo-800">Product List</CardTitle>
          <p className="text-sm text-indigo-600">Showing {products.length} products in inventory</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="divide-y divide-gray-200">
            <TableHeader className="bg-gray-50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Price</TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Stock</TableHead>
                <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</TableHead>
                <TableHead className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
              {paginatedProducts.map((product) => (
                <TableRow 
                  key={product.id}
                  className="hover:bg-blue-50 transition-colors duration-150"
                >
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    Rs{product.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.current_stock > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.current_stock} in stock
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                      {product.categories?.name || 'Uncategorized'}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(product)}
                      className="text-blue-600 hover:text-white hover:bg-blue-600 border-blue-200 hover:border-blue-600 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4.5L4 7m16 0l-8 4.5M4 7v9.5l8 4.5m0-14l8 4.5M4 16.5l8 4.5m8-4.5l-8-4.5m8 4.5V7" />
                      </svg>
                      <p className="text-lg font-medium">No products found</p>
                      <p className="text-sm">Add your first product to get started</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {products.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 border-t">
              <div className="text-sm text-gray-600 font-medium">
                Showing page {currentPage} of {totalPages} • {products.length} total products
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={!canGoPrevious}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={!canGoNext}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}