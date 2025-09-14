import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BottomNavigation } from './BottomNavigation';
import { MoreOptionsSheet } from './MoreOptionsSheet';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

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
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: 'hsl(var(--background))' }}
    >
      {/* Mobile layout */}
      <div className="flex flex-col md:hidden h-screen w-full">
        {/* Mobile Header */}
        <header
          className="flex items-center justify-center p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm z-50"
          style={{
            paddingTop: `calc(0.5rem + env(safe-area-inset-top))`,
            minHeight: `3.5rem`,
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

        {/* Main Content (mobile) */}
        <main className="flex-1 overflow-auto p-4 w-full">
          {children}
        </main>

        {/* Bottom Navigation (mobile only) */}
        <BottomNavigation onMoreClick={() => setIsMoreSheetOpen(true)} />

        {/* More Options Bottom Sheet */}
        <MoreOptionsSheet
          isOpen={isMoreSheetOpen}
          onClose={() => setIsMoreSheetOpen(false)}
        />
      </div>

      {/* Desktop / Tablet layout */}
      <div className="hidden md:block h-screen w-full">
        <SidebarProvider>
          <div className="flex h-full w-full">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full w-full">
              <Header />
              <main className="flex-1 overflow-auto p-6 w-full">
                <div className="max-w-[2000px] mx-auto w-full">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
}
