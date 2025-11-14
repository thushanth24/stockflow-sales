import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Package, RefreshCw, ClipboardCheck, Scale } from 'lucide-react';

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

interface StockEntryForm {
  previous_stock: number;
  actual_stock: number | '';
  lastUpdateDate?: string;
}

const defaultDate = new Date().toISOString().split('T')[0];

export default function StockUpdatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [stockEntries, setStockEntries] = useState<Record<string, StockEntryForm>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [latestUpdateDate, setLatestUpdateDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const dateChangeRequestedRef = useRef(false);
  const initialDateRef = useRef(defaultDate);
  const { user } = useAuth();
  const { toast } = useToast();

  const {
    currentData: paginatedProducts,
    currentPage,
    totalPages,
    goToPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ data: filteredProducts, itemsPerPage: 12 });

  const fetchStockUpdatesForDate = useCallback(async (date: string, productList: Product[]) => {
    if (!date || !productList.length) {
      setStockEntries({});
      return;
    }

    setEntriesLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_updates')
        .select('product_id, previous_stock, actual_stock, update_date')
        .eq('update_date', date);

      if (error) throw error;

      const updatesMap = new Map(
        (data || []).map(update => [update.product_id, update])
      );

      const nextEntries = productList.reduce<Record<string, StockEntryForm>>((acc, product) => {
        const match = updatesMap.get(product.id);
        const baseline = typeof match?.previous_stock === 'number'
          ? match.previous_stock
          : product.current_stock ?? 0;

        acc[product.id] = {
          previous_stock: baseline,
          actual_stock: typeof match?.actual_stock === 'number' ? match.actual_stock : baseline,
          lastUpdateDate: match?.update_date || undefined,
        };

        return acc;
      }, {});

      setStockEntries(nextEntries);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error fetching stock updates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load stock updates for the selected date.',
        variant: 'destructive',
      });
    } finally {
      setEntriesLoading(false);
    }
  }, [toast]);

  const loadProductsAndCategories = useCallback(async (date: string, showGlobalLoader = true) => {
    if (showGlobalLoader) {
      setLoading(true);
    }

    try {
      const [
        { data: productsData, error: productsError },
        { data: categoriesData, error: categoriesError },
        { data: latestData, error: latestError },
      ] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, sku, current_stock, category_id, categories(name)')
          .order('name'),
        supabase
          .from('categories')
          .select('id, name')
          .order('name'),
        supabase
          .from('stock_updates')
          .select('update_date')
          .order('update_date', { ascending: false })
          .limit(1),
      ]);

      if (productsError) throw productsError;
      if (categoriesError) throw categoriesError;
      if (latestError) throw latestError;

      const sortedProducts = (productsData || []).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setProducts(sortedProducts);
      setFilteredProducts(sortedProducts);
      setCategories(categoriesData || []);
      setLatestUpdateDate(latestData?.[0]?.update_date ?? null);

      if (sortedProducts.length) {
        await fetchStockUpdatesForDate(date, sortedProducts);
      } else {
        setStockEntries({});
      }
    } catch (error) {
      console.error('Error loading stock data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products for stock updates.',
        variant: 'destructive',
      });
    } finally {
      if (showGlobalLoader) {
        setLoading(false);
      }
    }
  }, [fetchStockUpdatesForDate, toast]);

  useEffect(() => {
    loadProductsAndCategories(initialDateRef.current);
  }, [loadProductsAndCategories]);

  useEffect(() => {
    if (!dateChangeRequestedRef.current) return;
    if (!selectedDate || !products.length) return;

    fetchStockUpdatesForDate(selectedDate, products);
    dateChangeRequestedRef.current = false;
  }, [selectedDate, products, fetchStockUpdatesForDate]);

  useEffect(() => {
    let filtered = [...products];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower)
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchTerm]);

  const stats = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let difference = 0;

    products.forEach(product => {
      const entry = stockEntries[product.id];

      if (!entry || entry.actual_stock === '' || entry.actual_stock === undefined) {
        pending += 1;
        return;
      }

      completed += 1;
      difference += Number(entry.actual_stock) - entry.previous_stock;
    });

    return {
      completed,
      pending,
      difference,
    };
  }, [products, stockEntries]);

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    dateChangeRequestedRef.current = true;
  };

  const handleEntryChange = (productId: string, field: 'previous_stock' | 'actual_stock', value: string) => {
    setStockEntries(prev => {
      const existing = prev[productId] ?? { previous_stock: 0, actual_stock: '' as number | '' };
      const nextEntries = { ...prev };
      const parsedValue = field === 'previous_stock'
        ? Math.max(0, parseInt(value, 10) || 0)
        : value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);

      nextEntries[productId] = {
        ...existing,
        [field]: parsedValue,
      };

      return nextEntries;
    });

    setHasUnsavedChanges(true);
  };

  const handleSaveStockUpdates = async () => {
    if (!selectedDate) {
      toast({
        title: 'Date required',
        description: 'Please pick a date before saving stock updates.',
        variant: 'destructive',
      });
      return;
    }

    const payload = Object.entries(stockEntries)
      .filter(([, entry]) => entry.actual_stock !== '' && entry.actual_stock !== undefined)
      .map(([productId, entry]) => ({
        product_id: productId,
        previous_stock: entry.previous_stock,
        actual_stock: Number(entry.actual_stock),
        update_date: selectedDate,
        ...(user?.id ? { created_by: user.id } : {}),
      }));

    if (!payload.length) {
      toast({
        title: 'No updates to save',
        description: 'Enter the actual stock for at least one product.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('stock_updates')
        .upsert(payload, { onConflict: 'product_id,update_date' });

      if (error) throw error;

      toast({
        title: 'Stock updated',
        description: `${payload.length} product${payload.length === 1 ? '' : 's'} recorded for ${selectedDate}.`,
      });

      await loadProductsAndCategories(selectedDate, false);
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error saving stock updates:', error);
      toast({
        title: 'Unable to save stock updates',
        description: error?.message || 'Please try again or contact an administrator.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 shadow-lg">
          <Skeleton className="h-8 w-48 bg-white/30" />
          <Skeleton className="h-4 w-3/4 mt-4 bg-white/20" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-8 pb-32 md:pb-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 p-3 md:p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white shadow-sm">
        <div className="w-full sm:w-auto">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-5 w-5" />
            <p className="text-xs uppercase tracking-wide text-white/80">Inventory</p>
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">Stock Update</h1>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-2xl">
            Record physical counts that are neither purchases nor sales so your stock stays aligned with the shelf.
          </p>
        </div>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex flex-col gap-2">
            <span className="text-lg font-semibold">Stock Update Controls</span>
            <span className="text-sm text-muted-foreground">
              Latest recorded stock date: {latestUpdateDate ? latestUpdateDate : 'No history yet'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category" className="bg-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search by name or SKU"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Stock Date</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  max={defaultDate}
                  onChange={e => handleDateChange(e.target.value)}
                  className="bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDateChange(defaultDate)}
                >
                  Today
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Updates are always tied to a specific day. Editing older entries may be restricted to the latest date.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClipboardCheck className="h-4 w-4 text-green-600" />
              <span>{stats.completed} products recorded</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scale className="h-4 w-4 text-blue-600" />
              <span>
                Net difference:{' '}
                <span className={stats.difference === 0 ? '' : stats.difference > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {stats.difference > 0 ? `+${stats.difference}` : stats.difference} units
                </span>
              </span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="ml-auto">
              Reset filters
            </Button>
            <Button
              type="button"
              onClick={() => loadProductsAndCategories(selectedDate, false)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            Products ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          {entriesLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                Loading stock entries...
              </div>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl">
              <p className="text-base font-medium text-gray-900">No products found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try a different filter or clear your search.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase">Product</TableHead>
                      <TableHead className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase text-right">Previous stock</TableHead>
                      <TableHead className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase text-right">Actual stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map(product => {
                      const entry = stockEntries[product.id];
                      const previous = entry?.previous_stock ?? product.current_stock;

                      return (
                        <TableRow key={product.id} className="hover:bg-slate-50/60 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">{product.name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Input
                              type="number"
                              min={0}
                              value={entry?.previous_stock ?? product.current_stock}
                              onChange={e => handleEntryChange(product.id, 'previous_stock', e.target.value)}
                              disabled={entriesLoading || submitting}
                              className="w-full max-w-[110px] ml-auto"
                            />
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Input
                              type="number"
                              min={0}
                              value={entry?.actual_stock ?? ''}
                              placeholder="Count"
                              onChange={e => handleEntryChange(product.id, 'actual_stock', e.target.value)}
                              disabled={entriesLoading || submitting}
                              className="w-full max-w-[110px] ml-auto"
                            />
                          </TableCell>
                        
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                canGoNext={canGoNext}
                canGoPrevious={canGoPrevious}
              />
            </>
          )}
        </CardContent>
      </Card>

      <div className="hidden md:flex flex-col md:flex-row items-center gap-4 md:justify-between">
        <p className="text-sm text-muted-foreground">
          {hasUnsavedChanges ? 'You have unsaved stock adjustments.' : 'All changes saved.'}
        </p>
        <Button
          type="button"
          disabled={submitting || entriesLoading || !hasUnsavedChanges}
          onClick={handleSaveStockUpdates}
          className="w-full md:w-auto flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save stock updates
        </Button>
      </div>

      <div 
        className="md:hidden fixed left-0 right-0 px-4 z-30"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg p-4 space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            {hasUnsavedChanges ? 'Review entries and save when everything looks good.' : 'All changes saved.'}
          </p>
          <Button
            type="button"
            disabled={submitting || entriesLoading || !hasUnsavedChanges}
            onClick={handleSaveStockUpdates}
            className="w-full flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save stock updates
          </Button>
        </div>
      </div>
    </div>
  );
}

