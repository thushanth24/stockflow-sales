import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Package, ShoppingCart, AlertTriangle, TrendingUp, Plus, ClipboardList, FileText, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface DashboardStats {
  totalProducts: number;
  recentPurchases: number;
  totalSales: number;
  recentDamages: number;
}

interface DailySalesData {
  date: string;
  sales: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    recentPurchases: 0,
    totalSales: 0,
    recentDamages: 0,
  });
  const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch total products
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Fetch recent purchases (last 7 days)
      const { data: recentPurchasesData } = await supabase
        .from('purchases')
        .select('quantity')
        .gte('purchase_date', weekAgo.toISOString().split('T')[0]);

      // Fetch total sales (last 30 days) - only for admin/super_admin
      let totalSales = 0;
      let dailySalesData: DailySalesData[] = [];
      
      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        const { data: salesData } = await supabase
          .from('sales')
          .select('revenue, sale_date')
          .gte('sale_date', weekAgo.toISOString().split('T')[0]);
        
        totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.revenue), 0) || 0;
        
        // Generate daily sales data for the last 7 days
        dailySalesData = generateDailySalesData(salesData || []);
      }

      // Fetch recent damages (last 7 days)
      const { data: recentDamagesData } = await supabase
        .from('damages')
        .select('quantity')
        .gte('damage_date', weekAgo.toISOString().split('T')[0]);

      setStats({
        totalProducts: productsCount || 0,
        recentPurchases: recentPurchasesData?.reduce((sum, purchase) => sum + purchase.quantity, 0) || 0,
        totalSales,
        recentDamages: recentDamagesData?.reduce((sum, damage) => sum + damage.quantity, 0) || 0,
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
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      <div className="space-y-6 relative">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Total Products</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {loading ? '--' : stats.totalProducts}
              </div>
              <p className="text-xs text-blue-600">
                Products in inventory
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Recent Purchases</CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10">
                <ShoppingCart className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {loading ? '--' : stats.recentPurchases}
              </div>
              <p className="text-xs text-green-600">
                This week
              </p>
            </CardContent>
          </Card>

          {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
            <>
              <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-800">Total Sales</CardTitle>
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900">
                    {loading ? 'Rs--' : `Rs ${stats.totalSales.toFixed(2)}`}
                  </div>
                  <p className="text-xs text-purple-600">
                    This month
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-800">Damage Reports</CardTitle>
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">
                    {loading ? '--' : stats.recentDamages}
                  </div>
                  <p className="text-xs text-orange-600">
                    This week
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-slate-800">Quick Actions</CardTitle>
              <CardDescription className="text-slate-600">
                Common tasks for your role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {/* Staff Actions */}
                {(profile?.role === 'staff' || profile?.role === 'admin' || profile?.role === 'super_admin') && (
                  <>
                    <Button 
                      onClick={() => navigate('/dashboard/purchases')}
                      className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4" />
                      Add Purchase
                    </Button>
                    <Button 
                      onClick={() => navigate('/dashboard/stock-update')}
                      className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                      variant="outline"
                    >
                      <ClipboardList className="h-4 w-4" />
                      Stock Update
                    </Button>
                    <Button 
                      onClick={() => navigate('/dashboard/damages')}
                      className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                      variant="outline"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Report Damage
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
            <CardContent>
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

        {/* Floating Action Button */}
        <FloatingActionButton />
      </div>
    </div>
  );
}