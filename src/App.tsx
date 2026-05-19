import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReactNode } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
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
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
// Finance Module Pages
import Vendors from "./pages/Vendors";
import Treasury from "./pages/Treasury";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import JournalVouchers from "./pages/JournalVouchers";
import Budget from "./pages/Budget";
import Procurement from "./pages/Procurement";
import PurchaseOrderPage from "./pages/PurchaseOrderPage";
import PurchaseInvoicePage from "./pages/PurchaseInvoicePage";
import RecordPaymentPage from "./pages/RecordPaymentPage";
import Receivables from "./pages/Receivables";
import RecordReceiptPage from "./pages/RecordReceiptPage";
import SupplierOpenInvoices from "./pages/SupplierOpenInvoices";
import TenantOpenInvoices from "./pages/TenantOpenInvoices";
import VatReturnPage from "./pages/VatReturnPage";
import PDCRegister from "./pages/PDCRegister";
import ActivityLog from "./pages/ActivityLog";
import BuildingAnnouncements from "./pages/BuildingAnnouncements";
import LedgerSetups from "./pages/LedgerSetups";
import Legal from "./pages/Legal";
import AccessDenied from "./pages/AccessDenied";
import { PAGE_PERMISSIONS } from "./lib/permissions";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isAuthenticated, loading, can } = useAuth();

  const withGuard = (path: string, element: ReactNode) => {
    const permissionCode = PAGE_PERMISSIONS[path];
    if (!permissionCode) return <AppLayout>{element}</AppLayout>;
    if (!can(permissionCode)) return <AppLayout><AccessDenied /></AppLayout>;
    return <AppLayout>{element}</AppLayout>;
  };

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
            <Route path="/" element={withGuard("/", <Dashboard />)} />
            <Route path="/properties" element={withGuard("/properties", <Properties />)} />
            <Route path="/tenants" element={withGuard("/tenants", <Tenants />)} />
            <Route path="/leases" element={withGuard("/leases", <Leases />)} />
            <Route path="/finance" element={withGuard("/finance", <Finance />)} />
            <Route path="/helpdesk" element={withGuard("/helpdesk", <Helpdesk />)} />
            <Route path="/reports" element={withGuard("/reports", <Reports />)} />
            <Route path="/leads" element={withGuard("/leads", <Leads />)} />
            <Route path="/units" element={withGuard("/units", <Units />)} />
            <Route path="/marketing" element={withGuard("/marketing", <Marketing />)} />
            <Route path="/settings" element={withGuard("/settings", <Settings />)} />
            <Route path="/profile" element={withGuard("/profile", <Profile />)} />
            {/* Finance Module Routes */}
            <Route path="/vendors" element={withGuard("/vendors", <Vendors />)} />
            <Route path="/treasury" element={withGuard("/treasury", <Treasury />)} />
            <Route path="/chart-of-accounts" element={withGuard("/chart-of-accounts", <ChartOfAccounts />)} />
            <Route path="/journal-vouchers" element={withGuard("/journal-vouchers", <JournalVouchers />)} />
            <Route path="/ledger-setups" element={withGuard("/ledger-setups", <LedgerSetups />)} />
            <Route path="/budget" element={withGuard("/budget", <Budget />)} />
            <Route path="/procurement" element={withGuard("/procurement", <Procurement />)} />
            <Route path="/procurement/purchase-orders/new" element={withGuard("/procurement", <PurchaseOrderPage />)} />
            <Route path="/procurement/purchase-orders/:id" element={withGuard("/procurement", <PurchaseOrderPage />)} />
            <Route path="/procurement/purchase-invoices/new" element={withGuard("/procurement", <PurchaseInvoicePage />)} />
            <Route path="/procurement/purchase-invoices/:id" element={withGuard("/procurement", <PurchaseInvoicePage />)} />
            <Route path="/finance/payments/new" element={withGuard("/finance", <RecordPaymentPage />)} />
            <Route path="/finance/payments/:id" element={withGuard("/finance", <RecordPaymentPage />)} />
            <Route
              path="/finance/supplier-open-invoices"
              element={withGuard("/finance/supplier-open-invoices", <SupplierOpenInvoices />)}
            />
            <Route
              path="/finance/tenant-open-invoices"
              element={withGuard("/finance/tenant-open-invoices", <TenantOpenInvoices />)}
            />
            <Route path="/finance/vat-return" element={withGuard("/finance/vat-return", <VatReturnPage />)} />
            <Route path="/finance/pdc" element={withGuard("/finance/pdc", <PDCRegister />)} />
            <Route path="/utilities/activity-log" element={withGuard("/utilities/activity-log", <ActivityLog />)} />
            <Route
              path="/communications/building-announcements"
              element={withGuard("/communications/building-announcements", <BuildingAnnouncements />)}
            />
            <Route path="/receivables" element={withGuard("/receivables", <Receivables />)} />
            <Route path="/receivables/new" element={withGuard("/receivables", <RecordReceiptPage />)} />
            <Route path="/receivables/:id" element={withGuard("/receivables", <RecordReceiptPage />)} />
            <Route path="/legal" element={withGuard("/legal", <Legal />)} />
            <Route path="/legal/:id" element={withGuard("/legal", <Legal />)} />
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
        <SettingsProvider>
          <AppRoutes />
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
