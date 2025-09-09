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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/50 shadow-lg z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-20 px-2 pb-2">
        {navigationItems.map((item) => {
          const isActive = item.id === 'more' ? false : location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all duration-200",
                "active:scale-95 rounded-xl mx-1",
                isActive 
                  ? "text-blue-600" 
                  : "text-gray-500 active:text-gray-700"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-200 mb-1",
                isActive ? "bg-blue-100" : "bg-transparent"
              )}>
                <Icon 
                  className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive && "scale-110"
                  )} 
                />
              </div>
              <span 
                className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
