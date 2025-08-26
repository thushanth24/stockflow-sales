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
import { Trash2, AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

interface Category {
  id: string;
  name: string;
}

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [damages, setDamages] = useState<Damage[]>([]);
  const [damageEntries, setDamageEntries] = useState<DamageEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
      // Fetch products with categories
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, current_stock, category_id, categories(name)')
        .order('name');

      if (productsError) throw productsError;
      const productsList = productsData || [];
      setProducts(productsList);
      setFilteredProducts(productsList);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
        
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

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

  const filterProducts = (search: string, categoryId: string) => {
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
    filterProducts(value, selectedCategory);
  };
  
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    filterProducts(searchTerm, categoryId);
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
        description: `Rs{validEntries.length} damage report(s) submitted successfully`,
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
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading damage reports...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Damage Reports</h1>
          <p className="text-blue-100 text-sm md:text-base">Log and track damaged inventory items</p>
        </div>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <CardTitle className="text-2xl font-bold text-indigo-800">Report Damages</CardTitle>
          <p className="text-sm text-indigo-600">Log damaged inventory items and track losses</p>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Damage Details</h3>
                <p className="text-xs text-gray-500">
                  {damageEntries.length} items to report
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <div className="flex flex-col w-full sm:w-auto">
                  <Label htmlFor="damage_date" className="text-xs text-gray-700 mb-1">Damage Date</Label>
                  <Input
                    id="damage_date"
                    type="date"
                    value={damageDate}
                    onChange={(e) => setDamageDate(e.target.value)}
                    className="w-full sm:w-48"
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={addDamageEntry} 
                  variant="outline"
                  className="w-full sm:w-auto gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </div>

            <div className="space-y-4">

              {damageEntries.length > 0 && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <Table className="divide-y divide-gray-200">
                    <TableHeader className="bg-gray-50 hidden sm:table-header-group">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</TableHead>
                        <TableHead className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Current</TableHead>
                        <TableHead className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</TableHead>
                        <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Reason</TableHead>
                        <TableHead className="px-6 py-4 text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="bg-white divide-y divide-gray-200">
                      {damageEntries.map((entry, index) => {
                        const selectedProduct = products.find(p => p.id === entry.product_id);
                        return (
                          <TableRow key={index} className="hover:bg-blue-50 transition-colors duration-150 flex flex-col sm:table-row">
                            <TableCell>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="flex justify-between items-center">
                                    <Label htmlFor={`product-${index}`} className="block text-sm font-medium text-gray-700">Product</Label>
                                    {index === 0 && (
                                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                        <div className="w-full sm:w-48">
                                          <Input
                                            type="text"
                                            placeholder="Search products..."
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                            className="text-sm h-8"
                                          />
                                        </div>
                                        <div className="w-full sm:w-48">
                                          <select
                                            value={selectedCategory}
                                            onChange={(e) => handleCategoryChange(e.target.value)}
                                            className="text-sm h-8 w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                          >
                                            <option value="all">All Categories</option>
                                            {categories.map((category) => (
                                              <option key={category.id} value={category.id}>
                                                {category.name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <select
                                    id={`product-${index}`}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    value={entry.product_id}
                                    onChange={(e) => updateDamageEntry(index, 'product_id', e.target.value)}
                                  >
                                    <option value="">Select a product</option>
                                    {filteredProducts.map((product) => (
                                      <option key={product.id} value={product.id}>
                                        {product.name} ({product.sku}) - {product.current_stock} in stock
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-between sm:justify-end items-center">
                                <span className="text-xs font-medium text-gray-500 sm:hidden">Current</span>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  (selectedProduct?.current_stock || 0) > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {selectedProduct?.current_stock || 0} in stock
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-between items-center sm:justify-end">
                                <span className="text-xs font-medium text-gray-500 sm:hidden">Quantity</span>
                                <Input
                                  type="number"
                                  min="1"
                                  value={entry.quantity || ''}
                                  onChange={(e) => updateDamageEntry(index, 'quantity', parseInt(e.target.value) || 0)}
                                  className="w-24 text-right"
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Textarea
                                value={entry.reason}
                                onChange={(e) => updateDamageEntry(index, 'reason', e.target.value)}
                                placeholder="Enter reason for damage..."
                                className="min-h-[60px] text-sm"
                                rows={2}
                              />
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDamageEntry(index)}
                                  className="text-red-600 hover:text-white hover:bg-red-600 border-red-200 hover:border-red-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {damageEntries.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-lg font-medium text-gray-900">No damage entries</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add a product to report damage
                  </p>
                </div>
              )}

              {damageEntries.length > 0 && (
                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md transition-all hover:scale-105"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Damage Reports'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <CardTitle className="text-2xl font-bold text-gray-800">Recent Damage Reports</CardTitle>
          <p className="text-sm text-gray-600">View and track previously reported damages</p>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile list view */}
          <div className="sm:hidden divide-y">
            {paginatedDamages.map((damage) => (
              <div key={damage.id} className="p-4 flex flex-col gap-2">
                <div className="text-base font-medium">{damage.products.name}</div>
                <div className="text-xs text-gray-500">{damage.products.sku}</div>
                <div className="flex items-center justify-between text-sm">
                  <span>Qty</span>
                  <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">{damage.quantity}</span>
                </div>
                <div className="text-sm text-gray-700 line-clamp-3" title={damage.reason}>{damage.reason}</div>
                <div className="text-xs text-muted-foreground">{new Date(damage.damage_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              </div>
            ))}
            {damages.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <AlertTriangle className="h-12 w-12 text-gray-400" />
                  <p className="text-lg font-medium">No damage reports found</p>
                  <p className="text-sm">Report your first damage to get started</p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop/tablet table view */}
          <div className="hidden sm:block overflow-x-auto">
            <Table className="min-w-full divide-y divide-gray-200">
              <TableHeader className="bg-gray-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</TableHead>
                  <TableHead className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Qty</TableHead>
                  <TableHead className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Reason</TableHead>
                  <TableHead className="px-6 py-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDamages.map((damage) => (
                  <TableRow key={damage.id} className="hover:bg-blue-50 transition-colors duration-150">
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{damage.products.name}</div>
                      <div className="text-xs text-gray-500">
                        {damage.products.sku}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        {damage.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2" title={damage.reason}>
                        {damage.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(damage.damage_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                  </TableRow>
                ))}
                {damages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertTriangle className="h-12 w-12 text-gray-400" />
                        <p className="text-lg font-medium">No damage reports found</p>
                        <p className="text-sm">Report your first damage to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {damages.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 border-t">
              <div className="text-sm text-gray-600 font-medium">
                Showing page {currentPage} of {totalPages} • {damages.length} total reports
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