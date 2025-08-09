import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import LoginPage from "@/components/auth/LoginPage";
import Dashboard from "@/pages/Dashboard";
import ProductsPage from "@/pages/staff/ProductsPage";
import PurchasesPage from "@/pages/staff/PurchasesPage";
import StockUpdatePage from "@/pages/staff/StockUpdatePage";
import DamagesPage from "@/pages/staff/DamagesPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import StockOverviewPage from "@/pages/admin/StockOverviewPage";
import DamageReportsPage from "@/pages/admin/DamageReportsPage";
import UserManagementPage from "@/pages/admin/UserManagementPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import Index from "@/pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<LoginPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/products" element={
              <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}>
                <DashboardLayout>
                  <ProductsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/purchases" element={
              <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}>
                <DashboardLayout>
                  <PurchasesPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/stock-update" element={
              <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}>
                <DashboardLayout>
                  <StockUpdatePage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/damages" element={
              <ProtectedRoute allowedRoles={['staff', 'admin', 'super_admin']}>
                <DashboardLayout>
                  <DamagesPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/dashboard/reports" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <DashboardLayout>
                  <ReportsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/stock-overview" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <DashboardLayout>
                  <StockOverviewPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/damage-reports" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <DashboardLayout>
                  <DamageReportsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Super Admin Routes */}
            <Route path="/dashboard/users" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <DashboardLayout>
                  <UserManagementPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/audit-logs" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <DashboardLayout>
                  <AuditLogsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
