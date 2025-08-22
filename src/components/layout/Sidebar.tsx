import { useAuth } from '@/hooks/useAuth';
import { 
  Sidebar as SidebarBase,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
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
  Shield,
  LogOut,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { Button } from '@/components/ui/button';

const getRoleColor = (role: string) => {
  switch (role) {
    case 'super_admin':
      return 'text-red-600 bg-red-50';
    case 'admin':
      return 'text-blue-600 bg-blue-50';
    case 'staff':
      return 'text-green-600 bg-green-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const formatRole = (role: string) => {
  return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const staffItems = [
    { icon: Package2, label: 'Products', href: '/dashboard/products' },
    { icon: Package, label: 'Categories', href: '/dashboard/categories' },
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
    { icon: Shield, label: 'Audit Logs', href: '/dashboard/audit-logs' },
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
    <SidebarBase className="bg-gradient-to-b from-indigo-50 to-blue-50 border-r border-blue-100">
      <SidebarHeader className="border-b border-blue-200 px-6 py-4 bg-white/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
            <Package className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
            Inventory
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarMenu>
            {visibleItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.href}
                  className={`group rounded-lg transition-all duration-200 hover:bg-white/80 hover:shadow-sm hover:border hover:border-white/50 ${location.pathname === item.href ? 'bg-white shadow-sm border border-white/50' : ''}`}
                >
                  <Link to={item.href} className="group-hover:text-indigo-700">
                    <item.icon className={`h-4 w-4 ${location.pathname === item.href ? 'text-indigo-600' : 'text-indigo-500 group-hover:text-indigo-600'}`} />
                    <span className={`font-medium ${location.pathname === item.href ? 'text-indigo-800' : 'text-gray-700 group-hover:text-indigo-800'}`}>
                      {item.label}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      {/* User Profile Section */}
      {profile && (
        <SidebarFooter className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-t border-blue-100 space-y-3">
          <div className="flex items-center gap-3 px-2 py-2 bg-white/80 rounded-lg shadow-sm">
            <Avatar className="h-9 w-9 border-2 border-white shadow">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {profile?.full_name || 'User'}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(profile.role)}`}>
                {formatRole(profile.role)}
              </span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-center gap-2 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 transition-colors rounded-lg py-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium">Sign out</span>
          </Button>
        </SidebarFooter>
      )}
    </SidebarBase>
  );
}