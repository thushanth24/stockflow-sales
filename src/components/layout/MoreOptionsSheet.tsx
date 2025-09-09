import { useAuth } from '@/hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Package,
  BarChart3,
  Users,
  AlertTriangle,
  Package2,
  Shield,
  LogOut,
  Settings,
  Bell,
  HelpCircle,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface MoreOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function MoreOptionsSheet({ isOpen, onClose }: MoreOptionsSheetProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Items that are NOT in the main bottom navigation or FAB
  const staffItems = [
    // No staff items - all moved to FAB or bottom nav
  ];

  const adminItems = [
    { icon: BarChart3, label: 'Reports', href: '/dashboard/reports' },
    { icon: AlertTriangle, label: 'Damage Reports', href: '/dashboard/damage-reports' },
  ];

  const superAdminItems = [
    { icon: Users, label: 'User Management', href: '/dashboard/users' },
    { icon: Shield, label: 'Audit Logs', href: '/dashboard/audit-logs' },
  ];

  const secondaryItems = [
    // No secondary items - removed as requested
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

  const handleItemClick = (href: string) => {
    navigate(href);
    onClose();
  };

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 transform transition-all duration-300 ease-out max-h-[90vh] overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-3">
          <div className="w-10 h-1 bg-gray-400 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">More</h2>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* User Profile Section */}
          {profile && (
            <div className="mb-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-500 text-white font-semibold">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {profile?.email}
                  </p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(profile.role)}`}>
                    {formatRole(profile.role)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Main Features */}
          {visibleItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Management
              </h3>
              <div className="space-y-2">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleItemClick(item.href)}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200",
                        "active:bg-gray-100 active:scale-98",
                        isActive 
                          ? "bg-blue-50 border border-blue-200" 
                          : "bg-white border border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-xl",
                        isActive ? "bg-blue-100" : "bg-gray-100"
                      )}>
                        <item.icon className={cn(
                          "h-5 w-5",
                          isActive ? "text-blue-600" : "text-gray-600"
                        )} />
                      </div>
                      <span className={cn(
                        "text-base font-medium",
                        isActive ? "text-blue-700" : "text-gray-700"
                      )}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Secondary Items - Only show if there are items */}
          {secondaryItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Settings
              </h3>
              <div className="space-y-2">
                {secondaryItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleItemClick(item.href)}
                      className={cn(
                        "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200",
                        "active:bg-gray-100 active:scale-98",
                        isActive 
                          ? "bg-blue-50 border border-blue-200" 
                          : "bg-white border border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-xl",
                        isActive ? "bg-blue-100" : "bg-gray-100"
                      )}>
                        <item.icon className={cn(
                          "h-5 w-5",
                          isActive ? "text-blue-600" : "text-gray-600"
                        )} />
                      </div>
                      <span className={cn(
                        "text-base font-medium",
                        isActive ? "text-blue-700" : "text-gray-700"
                      )}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <div className="pt-4 border-t border-gray-200">
            <button 
              className="w-full flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 active:bg-red-200 active:scale-98 text-red-700 border border-red-200 transition-all duration-200 rounded-2xl py-4"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              <span className="text-base font-semibold">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
