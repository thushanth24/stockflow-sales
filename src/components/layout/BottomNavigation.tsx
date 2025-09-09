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
    <nav className="fixed left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/50 shadow-lg z-50" style={{ 
      bottom: 'calc(env(safe-area-inset-bottom) + 8px)',
      paddingBottom: '8px'
    }}>
      <div className="flex items-center justify-around h-16 px-2">
        {navigationItems.map((item) => {
          const isActive = item.id === 'more' ? false : location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex items-center justify-center flex-1 py-3 px-2 transition-all duration-200",
                "active:scale-95 rounded-xl mx-1",
                isActive 
                  ? "text-blue-600" 
                  : "text-gray-500 active:text-gray-700"
              )}
            >
              <div className={cn(
                "p-3 rounded-xl transition-all duration-200",
                isActive ? "bg-blue-100" : "bg-transparent"
              )}>
                <Icon 
                  className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive && "scale-110"
                  )} 
                />
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
