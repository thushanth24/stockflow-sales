import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Menu, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile } = useAuth();

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-gray-50">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="md:hidden bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg p-2">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
              <Package className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
              Inventory Pro
            </h1>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={cn(
          "flex-1 overflow-auto p-4 md:p-6 w-full",
          "h-[calc(100vh-4rem)] md:h-screen"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}