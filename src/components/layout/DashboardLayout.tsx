import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BottomNavigation } from './BottomNavigation';
import { MoreOptionsSheet } from './MoreOptionsSheet';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile } = useAuth();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-gray-50" style={{ 
      backgroundColor: 'hsl(var(--background))',
      minHeight: '100vh'
    }}>
      {/* Mobile Header */}
      <header 
        className="flex items-center justify-center p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm fixed top-0 left-0 right-0 z-50"
        style={{ 
          paddingTop: `calc(1rem + env(safe-area-inset-top))`,
          height: `calc(4rem + env(safe-area-inset-top))`
        }}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
            <Package className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
            Regal
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-auto p-4 w-full"
      )} style={{ 
        marginTop: `calc(4rem + env(safe-area-inset-top))`,
        height: 'calc(100vh - 4rem - 4rem - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 16px)'
      }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation onMoreClick={() => setIsMoreSheetOpen(true)} />

      {/* More Options Bottom Sheet */}
      <MoreOptionsSheet 
        isOpen={isMoreSheetOpen} 
        onClose={() => setIsMoreSheetOpen(false)} 
      />
    </div>
  );
}