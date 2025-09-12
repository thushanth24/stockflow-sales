import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Calendar, Package } from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

interface DamageReportData {
  id: string;
  quantity: number;
  reason: string;
  damage_date: string;
  created_at: string;
  created_by: string;
  products: {
    name: string;
    sku: string;
    price: number;
  };
}

interface DamageStats {
  totalDamages: number;
  totalValue: number;
  recentDamages: number;
}

export default function DamageReportsPage() {
  const [damages, setDamages] = useState<DamageReportData[]>([]);
  const [stats, setStats] = useState<DamageStats>({
    totalDamages: 0,
    totalValue: 0,
    recentDamages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();

  const {
    currentData: paginatedReports,
    currentPage,
    totalPages,
    goToPage,
    canGoNext,
    canGoPrevious,
  } = usePagination({ data: damages, itemsPerPage: 10 });

  useEffect(() => {
    fetchDamageData();
  }, []);

  const fetchDamageData = async () => {
    try {
      // Fetch damage reports with product details only
      const { data: damagesData, error: damagesError } = await supabase
        .from('damages')
        .select(`
          id,
          quantity,
          reason,
          damage_date,
          created_at,
          created_by,
          products!inner(name, sku, price)
        `)
        .gte('damage_date', dateRange.from)
        .lte('damage_date', dateRange.to)
        .order('created_at', { ascending: false });

      if (damagesError) throw damagesError;
      setDamages(damagesData || []);

      // Calculate statistics
      const totalDamages = damagesData?.reduce((sum, damage) => sum + damage.quantity, 0) || 0;
      const totalValue = damagesData?.reduce((sum, damage) => 
        sum + (damage.quantity * Number(damage.products.price)), 0) || 0;
      
      // Recent damages (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const recentDamages = damagesData?.filter(damage => 
        damage.damage_date >= weekAgo).reduce((sum, damage) => sum + damage.quantity, 0) || 0;

      setStats({
        totalDamages,
        totalValue,
        recentDamages,
      });
    } catch (error) {
      console.error('Error fetching damage data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch damage reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = () => {
    setLoading(true);
    fetchDamageData();
  };

  if (loading) {
    return <div>Loading damage reports...</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Damage Reports</h1>
        </div>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <CardTitle className="text-2xl font-bold text-indigo-800">Date Range Filter</CardTitle>
        </CardHeader>
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

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Damaged Items</CardTitle>
            <div className="p-2 rounded-full bg-red-100 text-red-600">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDamages}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Total Damage Value</CardTitle>
            <div className="p-2 rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs{stats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-sm font-medium">Recent Damages (7 days)</CardTitle>
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentDamages}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
          <CardTitle className="text-2xl font-bold text-indigo-800">Damage Report Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {/* Mobile list view */}
          <div className="sm:hidden divide-y">
            {paginatedReports.map((damage) => (
              <div key={damage.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{new Date(damage.damage_date).toLocaleDateString()}</span>
                  <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    {damage.quantity}
                  </span>
                </div>
                <div className="text-base font-medium">{damage.products.name}</div>
                <div className="text-xs text-gray-500">{damage.products.sku}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Value</span>
                  <span className="text-base font-semibold text-red-700">Rs{(damage.quantity * Number(damage.products.price)).toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-700">{damage.reason}</div>
              </div>
            ))}
            {damages.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <AlertTriangle className="h-12 w-12 text-gray-400" />
                  <p className="text-lg font-medium">No damage reports found</p>
                  <p className="text-sm">No damages reported for the selected date range</p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop/tablet table view */}
          <div className="hidden sm:block overflow-x-auto">
            <Table className="min-w-full divide-y divide-gray-200">
              <TableHeader>
                <TableRow className="hover:bg-blue-50 transition-colors duration-150">
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Product</TableHead>
                  <TableHead className="whitespace-nowrap">Quantity</TableHead>
                  <TableHead className="whitespace-nowrap">Value</TableHead>
                  <TableHead className="whitespace-nowrap">Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((damage) => (
                  <TableRow key={damage.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(damage.damage_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{damage.products.name}</div>
                        <div className="text-xs text-gray-500">{damage.products.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        {damage.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-red-700">
                        Rs{(damage.quantity * Number(damage.products.price)).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={damage.reason}>
                      {damage.reason}
                    </TableCell>
                  </TableRow>
                ))}
                {damages.length === 0 && (
                  <TableRow className="hover:bg-blue-50 transition-colors duration-150">
                    <TableCell colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertTriangle className="h-12 w-12 text-gray-400" />
                        <p className="text-lg font-medium">No damage reports found</p>
                        <p className="text-sm">No damages reported for the selected date range</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {damages.length > 0 && (
            <div className="p-4 border-t">
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