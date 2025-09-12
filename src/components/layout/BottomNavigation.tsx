import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'purchases',
    label: 'Purchases',
    icon: ShoppingCart,
    path: '/dashboard/purchases',
  },
  {
    id: 'stock-update',
    label: 'Stock Update',
    icon: Package,
    path: '/dashboard/stock-update',
  },
  {
    id: 'more',
    label: 'More',
    icon: MoreHorizontal,
    path: '/dashboard/more',
  },
];

interface BottomNavigationProps {
  onMoreClick: () => void;
}

export function BottomNavigation({ onMoreClick }: BottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleItemClick = (item: typeof navigationItems[0]) => {
    if (item.id === 'more') {
      onMoreClick();
    } else {
      navigate(item.path);
    }
  };

  return (
    <nav className="fixed left-0 right-0 bg-gradient-to-r from-blue-100 to-indigo-100 border-t shadow-sm z-50 pt-1" style={{ 
      bottom: 'calc(env(safe-area-inset-bottom) + 0px)'
    }}>
      <div className="flex items-center justify-around h-20 px-2">
        {navigationItems.map((item) => {
          const isActive = item.id === 'more' ? false : location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex items-center justify-center flex-1 py-3 px-2 transition-all duration-200",
                "active:scale-95 rounded-xl mx-1"
              )}
            >
              <div className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 min-w-[60px]"
              )}>
                <div className={cn(
                  "p-1.5 rounded-lg transition-all duration-200"
                )}>
                  <Icon 
                    className={cn(
                      "h-5 w-5 mx-auto transition-all duration-200",
                      isActive ? "text-blue-600" : "text-gray-500",
                      isActive && "scale-110"
                    )} 
                  />
                </div>
                <span className={cn(
                  "text-xs mt-1 font-medium transition-all duration-200 text-gray-600 dark:text-gray-300"
                )}>
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
