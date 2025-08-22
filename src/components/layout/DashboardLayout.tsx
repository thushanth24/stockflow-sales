import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';
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
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <h1 className="text-lg font-semibold">Inventory Pro</h1>
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