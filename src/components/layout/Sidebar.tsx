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
  LayoutDashboard,
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

  const dashboardItem = { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' };

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
    let items = [dashboardItem, ...staffItems];
    
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
    <SidebarBase className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 border-r border-blue-200 shadow-lg">
      <SidebarHeader className="border-b border-blue-200/50 px-6 py-4 bg-gradient-to-r from-white/80 to-blue-50/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
            Inventory
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-6">
        <SidebarGroup>
          <SidebarMenu>
            {visibleItems.map((item, index) => {
              // Define colors for different menu items
              const getItemColors = (itemLabel: string) => {
                switch (itemLabel) {
                  case 'Dashboard':
                    return {
                      active: 'from-blue-500 to-indigo-600',
                      hover: 'from-blue-400 to-indigo-500',
                      icon: 'text-blue-600',
                      text: 'text-blue-800'
                    };
                  case 'Products':
                    return {
                      active: 'from-green-500 to-emerald-600',
                      hover: 'from-green-400 to-emerald-500',
                      icon: 'text-green-600',
                      text: 'text-green-800'
                    };
                  case 'Categories':
                    return {
                      active: 'from-teal-500 to-cyan-600',
                      hover: 'from-teal-400 to-cyan-500',
                      icon: 'text-teal-600',
                      text: 'text-teal-800'
                    };
                  case 'Add Purchase':
                    return {
                      active: 'from-emerald-500 to-green-600',
                      hover: 'from-emerald-400 to-green-500',
                      icon: 'text-emerald-600',
                      text: 'text-emerald-800'
                    };
                  case 'Stock Update':
                    return {
                      active: 'from-blue-500 to-indigo-600',
                      hover: 'from-blue-400 to-indigo-500',
                      icon: 'text-blue-600',
                      text: 'text-blue-800'
                    };
                  case 'Report Damage':
                    return {
                      active: 'from-orange-500 to-red-600',
                      hover: 'from-orange-400 to-red-500',
                      icon: 'text-orange-600',
                      text: 'text-orange-800'
                    };
                  case 'Reports':
                    return {
                      active: 'from-purple-500 to-violet-600',
                      hover: 'from-purple-400 to-violet-500',
                      icon: 'text-purple-600',
                      text: 'text-purple-800'
                    };
                  case 'Stock Overview':
                    return {
                      active: 'from-indigo-500 to-blue-600',
                      hover: 'from-indigo-400 to-blue-500',
                      icon: 'text-indigo-600',
                      text: 'text-indigo-800'
                    };
                  case 'Damage Reports':
                    return {
                      active: 'from-red-500 to-pink-600',
                      hover: 'from-red-400 to-pink-500',
                      icon: 'text-red-600',
                      text: 'text-red-800'
                    };
                  case 'User Management':
                    return {
                      active: 'from-violet-500 to-purple-600',
                      hover: 'from-violet-400 to-purple-500',
                      icon: 'text-violet-600',
                      text: 'text-violet-800'
                    };
                  case 'Audit Logs':
                    return {
                      active: 'from-slate-500 to-gray-600',
                      hover: 'from-slate-400 to-gray-500',
                      icon: 'text-slate-600',
                      text: 'text-slate-800'
                    };
                  default:
                    return {
                      active: 'from-gray-500 to-slate-600',
                      hover: 'from-gray-400 to-slate-500',
                      icon: 'text-gray-600',
                      text: 'text-gray-800'
                    };
                }
              };

              const colors = getItemColors(item.label);
              const isActive = location.pathname === item.href;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={`group rounded-xl transition-all duration-300 hover:shadow-md hover:scale-105 ${
                      isActive 
                        ? `bg-gradient-to-r ${colors.active} shadow-lg text-white border-0` 
                        : 'hover:bg-gradient-to-r hover:from-white/90 hover:to-blue-50/90 border border-transparent hover:border-blue-200/50'
                    }`}
                  >
                    <Link to={item.href} className={`group-hover:text-white ${isActive ? 'text-white' : colors.text}`}>
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : `bg-${colors.icon.split('-')[1]}-100`}`}>
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : colors.icon}`} />
                      </div>
                      <span className={`font-medium ${isActive ? 'text-white' : colors.text}`}>
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      {/* User Profile Section */}
      {profile && (
        <SidebarFooter className="p-4 bg-gradient-to-br from-white/90 via-blue-50/90 to-indigo-100/90 border-t border-blue-200/50 space-y-3 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-3 py-3 bg-gradient-to-r from-white/90 to-blue-50/90 rounded-xl shadow-md border border-blue-200/30">
            <Avatar className="h-10 w-10 border-2 border-white shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white font-semibold">
                {profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {profile?.full_name || 'User'}
              </p>
              <span className={`text-xs px-2 py-1 rounded-full font-medium shadow-sm ${getRoleColor(profile.role)}`}>
                {formatRole(profile.role)}
              </span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl py-2"
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