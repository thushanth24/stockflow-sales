import { useState, useEffect } from 'react';
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
  } = usePagination({ data: salesData, itemsPerPage: 10 });

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales Reports</h1>
        <p className="text-muted-foreground">View comprehensive sales analytics and metrics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="from-date">From Date</Label>
              <Input
                id="from-date"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">To Date</Label>
              <Input
                id="to-date"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <Button onClick={handleDateRangeChange}>
              Apply Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Damages</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDamages}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">{sale.products.name}</TableCell>
                  <TableCell>{sale.products.sku}</TableCell>
                  <TableCell>{sale.quantity}</TableCell>
                  <TableCell>${Number(sale.revenue).toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No sales data found for the selected date range
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="mt-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">Need to export data?</h3>
          <p className="text-muted-foreground">Export reports and data for external analysis</p>
        </div>
        <DataExport />
      </div>
    </div>
  );
}