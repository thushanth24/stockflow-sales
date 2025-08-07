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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<LoginPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/products" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProductsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/purchases" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PurchasesPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/stock-update" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <StockUpdatePage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard/damages" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DamagesPage />
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
