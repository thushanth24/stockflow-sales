import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DataExport } from '@/components/DataExport';
import { BarChart3, TrendingUp, Package, DollarSign, Download } from 'lucide-react';
import { generateSalesReportPDF, downloadPDF } from '@/lib/pdfUtils';

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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
      // Fetch sales data with category information
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          quantity,
          revenue,
          sale_date,
          products!inner(
            name,
            sku,
            categories (
              name
            )
          )
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

  interface Product {
    name: string;
    sku: string;
    price: number;
    categories: {
      name: string;
    } | null;
  }

  interface SaleWithProduct {
    id: string;
    quantity: number;
    revenue: number;
    sale_date: string;
    products: Product;
  }

  interface DamageWithProduct {
    id: string;
    quantity: number;
    reason: string;
    damage_date: string;
    products: Product;
  }

  interface FormattedSale {
    id: string;
    quantity: number;
    revenue: number;
    sale_date: string;
    category_name: string;
    product_name: string;
    unit_price: number;
  }

  interface FormattedDamage {
    id: string;
    quantity: number;
    reason: string;
    damage_date: string;
    category_name: string;
    product_name: string;
    unit_price: number;
  }

  const handleExportPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Fetch sales data with category information for PDF
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          quantity,
          revenue,
          sale_date,
          products (
            name,
            sku,
            price,
            categories (
              name
            )
          )
        `)
        .gte('sale_date', dateRange.from)
        .lte('sale_date', dateRange.to)
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      // Fetch damage data for the same period
      const { data: damageData, error: damageError } = await supabase
        .from('damages')
        .select(`
          id,
          quantity,
          reason,
          damage_date,
          products (
            name,
            sku,
            price,
            categories (
              name
            )
          )
        `)
        .gte('damage_date', dateRange.from)
        .lte('damage_date', dateRange.to)
        .order('damage_date', { ascending: false });

      if (damageError) throw damageError;

      // Flatten the nested data structure
      const formattedSales: FormattedSale[] = (salesData || []).map(sale => ({
        id: sale.id,
        quantity: sale.quantity,
        revenue: sale.revenue,
        sale_date: sale.sale_date,
        category_name: sale.products?.categories?.name || 'Uncategorized',
        product_name: sale.products?.name || 'Unknown Product',
        unit_price: sale.products?.price || 0,
      }));

      const formattedDamages: FormattedDamage[] = (damageData || []).map(damage => ({
        id: damage.id,
        quantity: damage.quantity,
        reason: damage.reason || '',
        damage_date: damage.damage_date,
        category_name: damage.products?.categories?.name || 'Uncategorized',
        product_name: damage.products?.name || 'Unknown Product',
        unit_price: damage.products?.price || 0,
      }));

      // Generate and download PDF
      const reportDate = dateRange.from === dateRange.to 
        ? dateRange.from 
        : `${dateRange.from} to ${dateRange.to}`;
      
      const doc = await generateSalesReportPDF(
        formattedSales,
        formattedDamages,
        reportDate
      );
      
      const filename = `Regal-Sales-Report-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPDF(doc, filename);
      
      toast({
        title: 'Success',
        description: 'PDF report generated successfully',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          {/* Header Skeleton */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-md h-16">
            <div className="h-6 bg-blue-500/30 rounded w-1/3"></div>
          </div>
          
          {/* Date Range Picker Skeleton */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-10 bg-gray-100 rounded-md"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-10 bg-gray-100 rounded-md"></div>
              </div>
              <div className="flex items-end">
                <div className="h-10 bg-blue-100 rounded-md w-24"></div>
              </div>
            </div>
          </div>
          
          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 w-8 bg-gray-100 rounded-full"></div>
                </div>
                <div className="h-6 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          
          {/* Sales Table Skeleton */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-4 gap-4 pb-2 border-b">
                {['Date', 'Product', 'Qty', 'Amount'].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
              
              {/* Table Rows */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 py-3 border-b">
                  <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-100 rounded"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Export Section Skeleton */}
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-gray-100 rounded-md"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-3 py-2 sm:py-3 flex-1 overflow-y-auto space-y-4 sm:space-y-5" style={{ maxHeight: 'calc(100vh - 100px)' }}>
      <motion.div 
        className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-md text-white shadow-sm"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <h1 className="text-base sm:text-lg font-semibold tracking-tight">Sales Reports</h1>
      </motion.div>

      <Card className="border-0 shadow-xs mt-2 sm:mt-3">
        <CardContent className="p-2">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="space-y-2 w-full sm:w-40">
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
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02] py-1 h-8 px-3"
            >
              Apply Filter
            </Button>
            <Button 
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              variant="outline"
              className="w-full sm:w-auto flex items-center gap-1.5 text-xs sm:text-sm h-8 px-3"
            >
              <Download className="h-3.5 w-3.5" />
              {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2 grid-cols-2 xs:grid-cols-2 md:grid-cols-4 mt-2 sm:mt-3">
        <Card className="border-0 shadow-xs hover:shadow-sm transition-all duration-100 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1.5 sm:p-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-sm sm:text-base font-medium">Rs{stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xs hover:shadow-sm transition-all duration-100 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1.5 sm:p-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <div className="p-2 rounded-full bg-green-100 text-green-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-sm sm:text-base font-medium">{stats.totalSales}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xs hover:shadow-sm transition-all duration-100 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1.5 sm:p-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <div className="p-2 rounded-full bg-purple-100 text-purple-600">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-sm sm:text-base font-medium">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xs hover:shadow-sm transition-all duration-100 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-1.5 sm:p-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Damages</CardTitle>
            <div className="p-2 rounded-full bg-amber-100 text-amber-600">
              <BarChart3 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-sm sm:text-base font-medium">{stats.totalDamages}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 sm:mt-5">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <CardTitle className="text-base sm:text-lg font-semibold text-indigo-800">Sales Detail</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {/* Mobile list view */}
          <div className="sm:hidden divide-y -mx-1">
            {sales.map((sale) => (
              <div key={sale.id} className="p-2 flex flex-col gap-1 bg-white">
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
          <div className="hidden sm:block overflow-x-auto -mx-1 sm:mx-0 text-sm">
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
      
      <Card className="border-0 shadow-xs overflow-hidden mt-4 sm:mt-5">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b p-2">
          <CardTitle className="text-sm font-medium text-indigo-800">Data Export</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="scale-90 sm:scale-100 origin-top-left">
            <DataExport />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

