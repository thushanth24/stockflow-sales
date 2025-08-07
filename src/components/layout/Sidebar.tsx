import { useAuth } from '@/hooks/useAuth';
import { 
  Sidebar as SidebarBase,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { 
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  AlertTriangle,
  TrendingUp,
  Package2,
  ClipboardList,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function Sidebar() {
  const { profile } = useAuth();
  const location = useLocation();

  const staffItems = [
    { icon: Package2, label: 'Products', href: '/dashboard/products' },
    { icon: ShoppingCart, label: 'Add Purchase', href: '/dashboard/purchases' },
    { icon: ClipboardList, label: 'Stock Update', href: '/dashboard/stock-update' },
    { icon: AlertTriangle, label: 'Report Damage', href: '/dashboard/damages' },
  ];

  const adminItems = [
    { icon: BarChart3, label: 'Reports', href: '/dashboard/reports' },
    { icon: Package, label: 'Stock Overview', href: '/dashboard/stock-overview' },
    { icon: AlertTriangle, label: 'Damage Reports', href: '/dashboard/damage-reports' },
  ];

  const superAdminItems = [
    { icon: Users, label: 'User Management', href: '/dashboard/users' },
  ];

  const getVisibleItems = () => {
    let items = [...staffItems];
    
    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      items = [...items, ...adminItems];
    }
    
    if (profile?.role === 'super_admin') {
      items = [...items, ...superAdminItems];
    }
    
    return items;
  };

  const visibleItems = getVisibleItems();

  return (
    <SidebarBase>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-sidebar-primary" />
          <span className="font-semibold text-sidebar-foreground">Inventory Pro</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {visibleItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.href}
                >
                  <Link to={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </SidebarBase>
  );
}