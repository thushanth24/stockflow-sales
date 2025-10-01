import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Package, 
  Tag, 
  BarChart3, 
  AlertTriangle,
  Wallet,
  Receipt,
  X,
  Package as BottleIcon,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  className?: string;
}

const actionItems = [
 
  {
    id: 'bottles',
    label: 'Bottles',
    icon: BottleIcon,
    href: '/dashboard/bottles',
    color: 'bg-amber-500 hover:bg-amber-600',
    iconColor: 'text-white'
  },
  {
    id: 'stock-overview',
    label: 'Stock Overview',
    icon: BarChart3,
    href: '/dashboard/stock-overview',
    color: 'bg-purple-500 hover:bg-purple-600',
    iconColor: 'text-white'
  },
  {
    id: 'other-income',
    label: 'Other Income',
    icon: Wallet,
    href: '/dashboard/other-income',
    color: 'bg-orange-500 hover:bg-orange-600',
    iconColor: 'text-white'
  },
  {
    id: 'other-expenses',
    label: 'Other Expenses',
    icon: Receipt,
    href: '/dashboard/other-expenses',
    color: 'bg-rose-500 hover:bg-rose-600',
    iconColor: 'text-white'
  },
  {
    id: 'damage-report',
    label: 'Damage Report',
    icon: AlertTriangle,
    href: '/dashboard/damages',
    color: 'bg-red-500 hover:bg-red-600',
    iconColor: 'text-white'
  },
  {
    id: 'restore-sales',
    label: 'Restore Sales',
    icon: RotateCcw,
    href: '/dashboard/restore-sales',
    color: 'bg-indigo-500 hover:bg-indigo-600',
    iconColor: 'text-white'
  },
];

export function FloatingActionButton({ className }: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const handleActionClick = (href: string) => {
    navigate(href);
    setIsExpanded(false);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("fixed right-4 z-40 flex flex-col items-end", className)} style={{ 
      bottom: 'calc(env(safe-area-inset-bottom) + 88px)'
    }}>
      {/* Action Items */}
      <div className={cn(
        "flex flex-col-reverse gap-4 mb-4 transition-all duration-300 ease-out",
        isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
      )}>
        {actionItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-end gap-3 transition-all duration-300 ease-out",
                isExpanded ? "translate-x-0 scale-100" : "translate-x-8 scale-75"
              )}
              style={{ 
                transitionDelay: isExpanded ? `${index * 80}ms` : '0ms' 
              }}
            >
              {/* Label */}
              <div className="bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shadow-xl border border-gray-700/50">
                {item.label}
              </div>
              
              {/* Action Button */}
              <button
                onClick={() => handleActionClick(item.href)}
                className={cn(
                  "w-14 h-14 rounded-full shadow-xl transition-all duration-200 flex items-center justify-center",
                  "hover:scale-110 active:scale-95 border-2 border-white/20",
                  item.color
                )}
              >
                <Icon className={cn("h-6 w-6", item.iconColor)} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Main FAB */}
      <button
        onClick={toggleExpanded}
        className={cn(
          "w-16 h-16 rounded-full shadow-xl transition-all duration-300 ease-out flex items-center justify-center",
          "hover:scale-110 active:scale-95 border-2 border-white/20",
          isExpanded 
            ? "bg-red-500 hover:bg-red-600 rotate-45" 
            : "bg-blue-500 hover:bg-blue-600 rotate-0"
        )}
      >
        {isExpanded ? (
          <X className="h-7 w-7 text-white" />
        ) : (
          <Plus className="h-7 w-7 text-white" />
        )}
      </button>
    </div>
  );
}
