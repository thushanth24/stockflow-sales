import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, AlertTriangle, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  recentPurchases: number;
  totalSales: number;
  recentDamages: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    recentPurchases: 0,
    totalSales: 0,
    recentDamages: 0,
  });
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
      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        const { data: salesData } = await supabase
          .from('sales')
          .select('revenue')
          .gte('sale_date', monthAgo.toISOString().split('T')[0]);
        
        totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.revenue), 0) || 0;
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
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name}!</h1>
        <p className="text-muted-foreground">
          You're logged in as a {formatRole(profile?.role || '')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '--' : stats.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground">
              Products in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '--' : stats.recentPurchases}
            </div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>

        {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">
                   {loading ? 'Rs--' : `RsRs{stats.totalSales.toFixed(2)}`}
                 </div>
                 <p className="text-xs text-muted-foreground">
                   This month
                 </p>
               </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Damage Reports</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">
                   {loading ? '--' : stats.recentDamages}
                 </div>
                 <p className="text-xs text-muted-foreground">
                   This week
                 </p>
               </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks for your role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile?.role === 'staff' && (
                <>
                  <p>• Add new products to inventory</p>
                  <p>• Log new stock purchases</p>
                  <p>• Update daily stock counts</p>
                  <p>• Report damaged items</p>
                </>
              )}
              {profile?.role === 'admin' && (
                <>
                  <p>• View sales reports and analytics</p>
                  <p>• Monitor stock levels</p>
                  <p>• Review damage reports</p>
                  <p>• Access all staff functions</p>
                </>
              )}
              {profile?.role === 'super_admin' && (
                <>
                  <p>• Manage user accounts and permissions</p>
                  <p>• Access all system features</p>
                  <p>• View comprehensive reports</p>
                  <p>• System administration</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Database</span>
                <span className="text-green-600">Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Authentication</span>
                <span className="text-green-600">Active</span>
              </div>
              <div className="flex justify-between">
                <span>Your Role</span>
                <span className="font-medium">{formatRole(profile?.role || '')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}