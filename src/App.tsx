import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginForm from "./components/auth/LoginForm";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Leases from "./pages/Leases";
import Finance from "./pages/Finance";
import Helpdesk from "./pages/Helpdesk";
import Reports from "./pages/Reports";
import Leads from "./pages/Leads";
import Units from "./pages/Units";
import Marketing from "./pages/Marketing";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
// Finance Module Pages
import Vendors from "./pages/Vendors";
import Treasury from "./pages/Treasury";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import Budget from "./pages/Budget";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={isAuthenticated ? <AppLayout><Dashboard /></AppLayout> : <LoginForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        {!isAuthenticated ? (
          <Route path="*" element={<LoginForm />} />
        ) : (
          <>
            <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/properties" element={<AppLayout><Properties /></AppLayout>} />
            <Route path="/tenants" element={<AppLayout><Tenants /></AppLayout>} />
            <Route path="/leases" element={<AppLayout><Leases /></AppLayout>} />
            <Route path="/finance" element={<AppLayout><Finance /></AppLayout>} />
            <Route path="/helpdesk" element={<AppLayout><Helpdesk /></AppLayout>} />
            <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
            <Route path="/leads" element={<AppLayout><Leads /></AppLayout>} />
            <Route path="/units" element={<AppLayout><Units /></AppLayout>} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            {/* Finance Module Routes */}
            <Route path="/vendors" element={<AppLayout><Vendors /></AppLayout>} />
            <Route path="/treasury" element={<AppLayout><Treasury /></AppLayout>} />
            <Route path="/chart-of-accounts" element={<AppLayout><ChartOfAccounts /></AppLayout>} />
            <Route path="/budget" element={<AppLayout><Budget /></AppLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
