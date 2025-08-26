import { useState, useEffect, useMemo } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DataExport } from '@/components/DataExport';
import { BarChart3, TrendingUp, Package, DollarSign } from 'lucide-react';

interface SalesData {
  id: string;
  quantity: number;
  revenue: number;
  sale_date: string;
  products: {
    name: string;
    sku: string;
  };
}

interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  totalProducts: number;
  totalDamages: number;
}

export default function ReportsPage() {
  const [sales, setSales] = useState<SalesData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalSales: 0,
    totalProducts: 0,
    totalDamages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();

  const {
    currentData: paginatedSales,
    currentPage,
    totalPages,
    goToPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ data: sales, itemsPerPage: 10 });

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      // Fetch sales data
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          quantity,
          revenue,
          sale_date,
          products!inner(name, sku)
        `)
        .gte('sale_date', dateRange.from)
        .lte('sale_date', dateRange.to)
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;
      setSales(salesData || []);

      // Fetch dashboard stats
      const [revenueResult, productsResult, damagesResult] = await Promise.all([
        supabase
          .from('sales')
          .select('revenue, quantity')
          .gte('sale_date', dateRange.from)
          .lte('sale_date', dateRange.to),
        supabase
          .from('products')
          .select('id'),
        supabase
          .from('damages')
          .select('quantity')
          .gte('damage_date', dateRange.from)
          .lte('damage_date', dateRange.to),
      ]);

      if (revenueResult.error) throw revenueResult.error;
      if (productsResult.error) throw productsResult.error;
      if (damagesResult.error) throw damagesResult.error;

      const totalRevenue = revenueResult.data?.reduce((sum, sale) => sum + Number(sale.revenue), 0) || 0;
      const totalSales = revenueResult.data?.reduce((sum, sale) => sum + sale.quantity, 0) || 0;
      const totalProducts = productsResult.data?.length || 0;
      const totalDamages = damagesResult.data?.reduce((sum, damage) => sum + damage.quantity, 0) || 0;

      setStats({
        totalRevenue,
        totalSales,
        totalProducts,
        totalDamages,
      });
    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch reports data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = () => {
    setLoading(true);
    fetchReportsData();
  };

  if (loading) {
    return <div>Loading reports...</div>;
  }

  return (
    <div className="space-y-8 p-4 md:p-6 bg-gradient-to-b from-gray-50 to-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Sales Reports</h1>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <Label htmlFor="from-date">From Date</Label>
              <Input
                id="from-date"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label htmlFor="to-date">To Date</Label>
              <Input
                id="to-date"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full"
              />
            </div>
            <Button 
              onClick={handleDateRangeChange}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md transition-all hover:scale-105"
            >
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs{stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <div className="p-2 rounded-full bg-green-100 text-green-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <div className="p-2 rounded-full bg-purple-100 text-purple-600">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Damages</CardTitle>
            <div className="p-2 rounded-full bg-amber-100 text-amber-600">
              <BarChart3 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDamages}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <CardTitle className="text-2xl font-bold text-indigo-800">Sales Detail</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {/* Mobile list view */}
          <div className="sm:hidden divide-y">
            {sales.map((sale) => (
              <div key={sale.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{new Date(sale.sale_date).toLocaleDateString()}</span>
                  <span className="text-sm font-semibold">Qty: {sale.quantity}</span>
                </div>
                <div className="text-base font-medium">{sale.products.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Revenue</span>
                  <span className="text-base font-semibold">Rs{Number(sale.revenue).toFixed(2)}</span>
                </div>
              </div>
            ))}
            {sales.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">No sales data found for the selected date range</div>
            )}
          </div>

          {/* Tablet/Desktop table view */}
          <div className="hidden sm:block overflow-x-auto">
            <Table className="min-w-full divide-y divide-gray-200 text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Product</TableHead>
                  <TableHead className="whitespace-nowrap">Quantity</TableHead>
                  <TableHead className="whitespace-nowrap">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="whitespace-nowrap">{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{sale.products.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{sale.quantity}</TableCell>
                    <TableCell className="whitespace-nowrap">Rs{Number(sale.revenue).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No sales data found for the selected date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <CardTitle className="text-2xl font-bold text-indigo-800">Data Export</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <DataExport />
        </CardContent>
      </Card>
    </div>
  );
}