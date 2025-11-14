import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflinePage } from "@/components/OfflinePage";
import LoginPage from "@/components/auth/LoginPage";
import Dashboard from "@/pages/Dashboard";
import ProductsPage from "@/pages/staff/ProductsPage";
import PurchasesPage from "@/pages/staff/PurchasesPage";
import StockUpdatePage from "@/pages/staff/StockUpdatePage";
import DamagesPage from "@/pages/staff/DamagesPage";
import ReturnsPage from "@/pages/staff/ReturnsPage";
import RestoreSalesPage from "@/pages/staff/RestoreSalesPage";
import SalesEntryPage from "@/pages/staff/SalesEntryPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import StockOverviewPage from "@/pages/admin/StockOverviewPage";
import DamageReportsPage from "@/pages/admin/DamageReportsPage";
import OtherIncomePage from "@/pages/admin/OtherIncomePage";
import OtherExpensePage from "@/pages/admin/OtherExpensePage";
import CategoriesPage from "@/pages/admin/CategoriesPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import BottlesPage from "@/pages/BottlesPage";
import Index from "@/pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Create a layout component that includes DashboardLayout
const DashboardLayoutWrapper = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout>
    {children}
  </DashboardLayout>
);

const App = () => {
  const isOnline = useOnlineStatus();
  
  // Show offline page if user is offline
  if (!isOnline) {
    return <OfflinePage />;
  }

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Navigate to="/auth" replace />
    },
    {
      path: "/auth",
      element: <LoginPage />
    },
    {
      path: "/dashboard",
      element: <ProtectedRoute><DashboardLayoutWrapper><Dashboard /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/products",
      element: <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}><DashboardLayoutWrapper><ProductsPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/purchases",
      element: <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}><DashboardLayoutWrapper><PurchasesPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/stock-update",
      element: <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}><DashboardLayoutWrapper><StockUpdatePage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/sales-entry",
      element: <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}><DashboardLayoutWrapper><SalesEntryPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/damages",
      element: <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}><DashboardLayoutWrapper><DamagesPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/returns",
      element: <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}><DashboardLayoutWrapper><ReturnsPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/reports",
      element: <ProtectedRoute allowedRoles={['admin', 'super_admin']}><DashboardLayoutWrapper><ReportsPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/stock-overview",
      element: <ProtectedRoute allowedRoles={['admin', 'super_admin']}><DashboardLayoutWrapper><StockOverviewPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/damage-reports",
      element: <ProtectedRoute allowedRoles={['admin', 'super_admin']}><DashboardLayoutWrapper><DamageReportsPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/other-income",
      element: <ProtectedRoute allowedRoles={['admin', 'super_admin']}><DashboardLayoutWrapper><OtherIncomePage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/other-expenses",
      element: <ProtectedRoute allowedRoles={['admin', 'super_admin']}><DashboardLayoutWrapper><OtherExpensePage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/categories",
      element: <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}><DashboardLayoutWrapper><CategoriesPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/users",
      element: <ProtectedRoute allowedRoles={['super_admin']}><DashboardLayoutWrapper><UserManagementPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/audit-logs",
      element: <ProtectedRoute allowedRoles={['super_admin']}><DashboardLayoutWrapper><AuditLogsPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/bottles",
      element: <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}><DashboardLayoutWrapper><BottlesPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "/dashboard/restore-sales",
      element: <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}><DashboardLayoutWrapper><RestoreSalesPage /></DashboardLayoutWrapper></ProtectedRoute>,
    },
    {
      path: "*",
      element: <NotFound />
    }
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RouterProvider 
            router={router} 
            future={{
              v7_startTransition: true
            }} 
          />
          <PWAInstallPrompt />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;





