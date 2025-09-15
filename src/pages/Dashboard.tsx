import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Package, ShoppingCart, AlertTriangle, TrendingUp, Plus, ClipboardList, FileText, BarChart3, RefreshCw, PackageSearch, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { downloadPDF } from '@/lib/categoryPdfUtils';
import { generateSalesReportPDF } from '@/lib/pdfUtils';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface DashboardStats {
  recentPurchases: number;
  recentSales: number;
  recentDamages: number;
  recentReturns: number;
}

interface DailySalesData {
  date: string;
  sales: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    recentPurchases: 0,
    recentSales: 0,
    recentDamages: 0,
    recentReturns: 0,
  });
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleDateRangeChange = () => {
    fetchDashboardStats();
  };

  const handleExportPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Fetch sales data
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

      // Fetch damage data
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

      // Fetch returns data
      const { data: returnsData, error: returnsError } = await supabase
        .from('returns')
        .select(`
          id,
          quantity,
          reason,
          return_date,
          products (
            name,
            sku,
            price,
            categories (
              name
            )
          )
        `)
        .gte('return_date', dateRange.from)
        .lte('return_date', dateRange.to)
        .order('return_date', { ascending: false });

      if (returnsError) throw returnsError;
      
      // Fetch bottle data (only added bottles, not cleared ones)
      const { data: bottlesData, error: bottlesError } = await supabase
        .from('bottles')
        .select('*')
        .eq('operation_type', 'add')
        .gte('date', dateRange.from)
        .lte('date', dateRange.to)
        .order('date', { ascending: false });
        
      if (bottlesError) throw bottlesError;

      // Format sales data
      const formattedSales = (salesData || []).map(sale => ({
        id: sale.id,
        quantity: sale.quantity,
        revenue: sale.revenue,
        sale_date: sale.sale_date,
        category_name: sale.products?.categories?.name || 'Uncategorized',
        product_name: sale.products?.name || 'Unknown Product',
        unit_price: sale.products?.price || 0,
      }));

      // Format damage data
      const formattedDamages = (damageData || []).map(damage => ({
        id: damage.id,
        quantity: damage.quantity,
        reason: damage.reason || '',
        damage_date: damage.damage_date,
        category_name: damage.products?.categories?.name || 'Uncategorized',
        product_name: damage.products?.name || 'Unknown Product',
        unit_price: damage.products?.price || 0,
      }));

      // Format returns data
      const formattedReturns = (returnsData || []).map(returnItem => {
        const unitPrice = returnItem.products?.price || 0;
        return {
          id: returnItem.id,
          quantity: returnItem.quantity,
          reason: returnItem.reason || '',
          return_date: returnItem.return_date,
          category_name: returnItem.products?.categories?.name || 'Uncategorized',
          product_name: returnItem.products?.name || 'Unknown Product',
          unit_price: unitPrice,
          revenue: returnItem.quantity * unitPrice, // Calculate the total value of the return
        };
      });
      
      // Format bottle data
      const formattedBottles = (bottlesData || []).map(bottle => ({
        id: bottle.id,
        type: bottle.type,
        unit: bottle.unit,
        quantity: bottle.quantity,
        price: bottle.price,
        date: bottle.date,
        operation_type: bottle.operation_type,
        display_date: new Date(bottle.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        total_value: bottle.quantity * bottle.price
      }));

      const reportDate = dateRange.from === dateRange.to 
        ? dateRange.from 
        : `${dateRange.from} to ${dateRange.to}`;
      
      const doc = await generateSalesReportPDF(
        formattedSales,
        formattedDamages,
        reportDate,
        formattedReturns,
        formattedBottles
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

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const weekAgo = new Date(dateRange.from);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch recent purchases (last 7 days)
      const { data: recentPurchasesData } = await supabase
        .from('purchases')
        .select('quantity')
        .gte('purchase_date', weekAgo.toISOString().split('T')[0]);

      // Fetch recent sales count (last 7 days)
      let recentSales = 0;
      let dailySalesData: DailySalesData[] = [];
      
      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        const { data: salesData, count: salesCount } = await supabase
          .from('sales')
          .select('sale_date', { count: 'exact' })
          .gte('sale_date', weekAgo.toISOString().split('T')[0]);
        
        recentSales = salesCount || 0;
        
        // Generate daily sales data for the last 7 days
        dailySalesData = generateDailySalesData(salesData || []);
      }

      // Fetch recent damages (last 7 days)
      const { data: recentDamagesData } = await supabase
        .from('damages')
        .select('quantity')
        .gte('damage_date', weekAgo.toISOString().split('T')[0]);

      // Fetch recent returns (last 7 days)
      const { data: recentReturnsData } = await supabase
        .from('returns')
        .select('quantity')
        .gte('return_date', weekAgo.toISOString().split('T')[0]);

      setStats({
        recentPurchases: recentPurchasesData?.reduce((sum, purchase) => sum + purchase.quantity, 0) || 0,
        recentSales,
        recentDamages: recentDamagesData?.reduce((sum, damage) => sum + damage.quantity, 0) || 0,
        recentReturns: recentReturnsData?.reduce((sum, returnItem) => sum + returnItem.quantity, 0) || 0,
      });
      setDailySales(dailySalesData);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailySalesData = (salesData: any[]): DailySalesData[] => {
    const dailyData: DailySalesData[] = [];
    const now = new Date();
    
    // Generate data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Filter sales for this specific date
      const daySales = salesData
        .filter(sale => sale.sale_date === dateString)
        .reduce((sum, sale) => sum + Number(sale.revenue), 0);
      
      dailyData.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        sales: daySales
      });
    }
    
    return dailyData;
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

    return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6 relative">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">

          <Card className="h-full bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-4 sm:pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Recent Purchases</CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10">
                <ShoppingCart className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2">
              <div className="text-xl sm:text-2xl font-bold text-green-900">
                {loading ? '--' : stats.recentPurchases}
              </div>
              <p className="text-xs text-green-600">
                This week
              </p>
            </CardContent>
          </Card>

          {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
            <>
              <Card className="h-full bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-4 sm:pb-2">
                  <CardTitle className="text-sm font-medium text-purple-800">Recent Sales</CardTitle>
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2">
                  <div className="text-xl sm:text-2xl font-bold text-purple-900">
                    {loading ? '--' : stats.recentSales}
                  </div>
                  <p className="text-xs text-purple-600">
                    This week
                  </p>
                </CardContent>
              </Card>

              <Card className="h-full bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-4 sm:pb-2">
                  <CardTitle className="text-sm font-medium text-orange-800">Damage Reports</CardTitle>
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2">
                  <div className="text-xl sm:text-2xl font-bold text-orange-900">
                    {loading ? '--' : stats.recentDamages}
                  </div>
                  <p className="text-xs text-orange-600">
                    This week
                  </p>
                </CardContent>
              </Card>

              <Card className="h-full bg-gradient-to-br from-rose-50 to-pink-100 border-rose-200 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-4 sm:pb-2">
                  <CardTitle className="text-sm font-medium text-rose-800">Returns This Week</CardTitle>
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <RefreshCw className="h-4 w-4 text-rose-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2">
                  <div className="text-xl sm:text-2xl font-bold text-rose-900">
                    {loading ? '--' : stats.recentReturns}
                  </div>
                  <p className="text-xs text-rose-600">
                    This week
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Date Range and Export Section */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2 w-full sm:w-48">
                <Label htmlFor="from-date" className="text-sm font-medium">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2 w-full sm:w-48">
                <Label htmlFor="to-date" className="text-sm font-medium">To Date</Label>
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
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                Apply Filter
              </Button>
              <Button 
                onClick={handleExportPDF}
                disabled={isGeneratingPDF}
                variant="outline"
                className="w-full sm:w-auto flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-slate-800">Quick Actions</CardTitle>
              <CardDescription className="text-slate-600">
                Common tasks for your role
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2">
              <div className="grid gap-3">
                {/* Staff Actions */}
                {(profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'super_admin') && (
                  <>
                    <Button 
                      onClick={() => navigate('/dashboard/stock-overview')}
                      className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                      variant="outline"
                    >
                      <PackageSearch className="h-4 w-4" />
                      Stock
                    </Button>
                    <Button 
                      onClick={() => navigate('/dashboard/returns')}
                      className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Returns
                    </Button>
                    <Button 
                      onClick={() => navigate('/dashboard/damages')}
                      className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                      variant="outline"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Damage
                    </Button>
                  </>
                )}
                
                {/* Admin Actions */}
                {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                  <Button 
                    onClick={() => navigate('/dashboard/reports')}
                    className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                    variant="outline"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Reports
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-pink-100 border-rose-200 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-rose-800">Daily Sales</CardTitle>
              <CardDescription className="text-rose-600">
                Sales performance for the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-1 sm:p-4 sm:pt-2">
              {(profile?.role === 'admin' || profile?.role === 'super_admin') ? (
                <div className="h-[300px]">
                  <ChartContainer
                    config={{
                      sales: {
                        label: "Sales",
                        color: "#ec4899",
                      },
                    }}
                  >
                    <BarChart data={dailySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `Rs ${value}`}
                      />
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Date
                                    </span>
                                    <span className="font-bold text-muted-foreground">
                                      {payload[0].payload.date}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Sales
                                    </span>
                                    <span className="font-bold">
                                      Rs {typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : '0.00'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar 
                        dataKey="sales" 
                        fill="#ec4899"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  <p>Sales data is only available for admin users</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Floating Action Button (mobile only) */}
        <FloatingActionButton className="md:hidden" />
      </div>
    </div>
  );
}
