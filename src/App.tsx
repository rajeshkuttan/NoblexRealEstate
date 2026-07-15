import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CompanyProvider } from "./contexts/CompanyContext";
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
import CompanySettingsAdmin from "./pages/settings/CompanySettingsAdmin";
import CompanyFinanceConfig from "./pages/settings/CompanyFinanceConfig";
import SystemHealthDashboard from "./pages/settings/SystemHealthDashboard";
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
import DirectPurchaseInvoicesPage from "./pages/finance/DirectPurchaseInvoicesPage";
import DirectPurchaseInvoicePage from "./pages/finance/DirectPurchaseInvoicePage";
import PrepaidExpenseDashboardPage from "./pages/finance/prepaid-expenses/PrepaidExpenseDashboardPage";
import PrepaidExpenseRegisterPage from "./pages/finance/prepaid-expenses/PrepaidExpenseRegisterPage";
import PrepaidExpenseFormPage from "./pages/finance/prepaid-expenses/PrepaidExpenseFormPage";
import PrepaidExpenseDetailPage from "./pages/finance/prepaid-expenses/PrepaidExpenseDetailPage";
import PrepaidExpenseSchedulesPage from "./pages/finance/prepaid-expenses/PrepaidExpenseSchedulesPage";
import PrepaidExpensePostingQueuePage from "./pages/finance/prepaid-expenses/PrepaidExpensePostingQueuePage";
import PrepaidExpenseReconciliationPage from "./pages/finance/prepaid-expenses/PrepaidExpenseReconciliationPage";
import PrepaidExpenseReportsPage from "./pages/finance/prepaid-expenses/PrepaidExpenseReportsPage";
import PrepaidExpenseSettingsPage from "./pages/finance/prepaid-expenses/PrepaidExpenseSettingsPage";
import LeaseRevenueDashboardPage from "./pages/finance/lease-revenue/LeaseRevenueDashboardPage";
import LeaseRevenueRegisterPage from "./pages/finance/lease-revenue/LeaseRevenueRegisterPage";
import LeaseRevenueFormPage from "./pages/finance/lease-revenue/LeaseRevenueFormPage";
import LeaseRevenueDetailPage from "./pages/finance/lease-revenue/LeaseRevenueDetailPage";
import LeaseRevenueSchedulesPage from "./pages/finance/lease-revenue/LeaseRevenueSchedulesPage";
import LeaseRevenuePostingQueuePage from "./pages/finance/lease-revenue/LeaseRevenuePostingQueuePage";
import LeaseRevenueReconciliationPage from "./pages/finance/lease-revenue/LeaseRevenueReconciliationPage";
import LeaseRevenueReportsPage from "./pages/finance/lease-revenue/LeaseRevenueReportsPage";
import LeaseRevenueSettingsPage from "./pages/finance/lease-revenue/LeaseRevenueSettingsPage";
import PayrollHubPage from "./pages/payroll/PayrollHubPage";
import PayrollOrganizationPage from "./pages/payroll/PayrollOrganizationPage";
import PayrollEmployeesPage from "./pages/payroll/PayrollEmployeesPage";
import PayrollEmployeePage from "./pages/payroll/PayrollEmployeePage";
import PayrollEmployee360Page from "./pages/payroll/PayrollEmployee360Page";
import PayrollAttendanceControlPage from "./pages/payroll/PayrollAttendanceControlPage";
import PayrollRunDetailPage from "./pages/payroll/PayrollRunDetailPage";
import PayrollWpsBatchDetailPage from "./pages/payroll/PayrollWpsBatchDetailPage";
import PayrollSettlementDetailPage from "./pages/payroll/PayrollSettlementDetailPage";
import PayrollReportsCenterPage from "./pages/payroll/PayrollReportsCenterPage";
import PayrollLeaveDashboardPage from "./pages/payroll/PayrollLeaveDashboardPage";
import PayrollComponentsPage from "./pages/payroll/PayrollComponentsPage";
import PayrollLeavePoliciesPage from "./pages/payroll/PayrollLeavePoliciesPage";
import PayrollShiftsPage from "./pages/payroll/PayrollShiftsPage";
import PayrollDocumentsPage from "./pages/payroll/PayrollDocumentsPage";
import PayrollSalaryStructuresPage from "./pages/payroll/PayrollSalaryStructuresPage";
import PayrollOperationsPage from "./pages/payroll/PayrollOperationsPage";
import PayrollLeaveOpeningBalancesPage from "./pages/payroll/PayrollLeaveOpeningBalancesPage";
import PayrollLeaveApplicationsPage from "./pages/payroll/PayrollLeaveApplicationsPage";
import PayrollAttendanceLogsPage from "./pages/payroll/PayrollAttendanceLogsPage";
import PayrollStaffAttendancePage from "./pages/payroll/PayrollStaffAttendancePage";
import PayrollLabourTimesheetsPage from "./pages/payroll/PayrollLabourTimesheetsPage";
import PayrollOvertimePage from "./pages/payroll/PayrollOvertimePage";
import PayrollAttendancePeriodsPage from "./pages/payroll/PayrollAttendancePeriodsPage";
import PayrollMonthlySummaryPage from "./pages/payroll/PayrollMonthlySummaryPage";
import PayrollReadinessPage from "./pages/payroll/PayrollReadinessPage";
import PayrollCalculationPage from "./pages/payroll/PayrollCalculationPage";
import PayrollPeriodsPage from "./pages/payroll/PayrollPeriodsPage";
import PayrollRunsPage from "./pages/payroll/PayrollRunsPage";
import PayrollAdjustmentsPage from "./pages/payroll/PayrollAdjustmentsPage";
import PayrollLoansPage from "./pages/payroll/PayrollLoansPage";
import PayrollRegisterPage from "./pages/payroll/PayrollRegisterPage";
import PayrollVariancePage from "./pages/payroll/PayrollVariancePage";
import PayrollWpsDashboardPage from "./pages/payroll/PayrollWpsDashboardPage";
import PayrollWpsBatchesPage from "./pages/payroll/PayrollWpsBatchesPage";
import PayrollWpsCompliancePage from "./pages/payroll/PayrollWpsCompliancePage";
import PayrollWpsConfigurationPage from "./pages/payroll/PayrollWpsConfigurationPage";
import PayrollEmiratisationPage from "./pages/payroll/PayrollEmiratisationPage";
import PayrollGpssaPage from "./pages/payroll/PayrollGpssaPage";
import PayrollFinalSettlementDashboardPage from "./pages/payroll/PayrollFinalSettlementDashboardPage";
import PayrollSeparationsPage from "./pages/payroll/PayrollSeparationsPage";
import PayrollFinalSettlementsPage from "./pages/payroll/PayrollFinalSettlementsPage";
import PayrollEosConfigurationPage from "./pages/payroll/PayrollEosConfigurationPage";
import PayrollSettlementRegisterPage from "./pages/payroll/PayrollSettlementRegisterPage";
import PayrollFinanceDashboardPage from "./pages/payroll/PayrollFinanceDashboardPage";
import PayrollAccountConfigPage from "./pages/payroll/PayrollAccountConfigPage";
import PayrollEmployeeLedgerPage from "./pages/payroll/PayrollEmployeeLedgerPage";
import PayrollPostingRegisterPage from "./pages/payroll/PayrollPostingRegisterPage";
import PayrollFinanceReconciliationPage from "./pages/payroll/PayrollFinanceReconciliationPage";
import PayrollDocumentsHubPage from "./pages/payroll/PayrollDocumentsHubPage";
import PayrollPayslipsPage from "./pages/payroll/PayrollPayslipsPage";
import PayrollSalaryCertificatesPage from "./pages/payroll/PayrollSalaryCertificatesPage";
import PayrollSettlementDocumentsPage from "./pages/payroll/PayrollSettlementDocumentsPage";
import PayrollExportsPage from "./pages/payroll/PayrollExportsPage";
import TenantOpenInvoices from "./pages/TenantOpenInvoices";
import VatReturnPage from "./pages/VatReturnPage";
import PDCRegister from "./pages/PDCRegister";
import ActivityLog from "./pages/ActivityLog";
import BuildingAnnouncements from "./pages/BuildingAnnouncements";
import LedgerSetups from "./pages/LedgerSetups";
import Legal from "./pages/Legal";
import InvestmentDashboardPage from "./pages/investments/InvestmentDashboardPage";
import InvestmentPortfolioPage from "./pages/investments/InvestmentPortfolioPage";
import InvestmentAssetFormPage from "./pages/investments/InvestmentAssetFormPage";
import InvestmentAssetDetailPage from "./pages/investments/InvestmentAssetDetailPage";
import InvestmentTransactionsPage from "./pages/investments/InvestmentTransactionsPage";
import InvestmentDividendsPage from "./pages/investments/InvestmentDividendsPage";
import InvestmentValuationsPage from "./pages/investments/InvestmentValuationsPage";
import InvestmentAllocationsPage from "./pages/investments/InvestmentAllocationsPage";
import InvestmentReportsPage from "./pages/investments/InvestmentReportsPage";
import InvestmentSettingsPage from "./pages/investments/InvestmentSettingsPage";
import InvestmentCategoriesPage from "./pages/investments/InvestmentCategoriesPage";
import InvestmentDistributionsPage from "./pages/investments/InvestmentDistributionsPage";
import InvestmentPortfoliosPage from "./pages/investments/portfolio/InvestmentPortfoliosPage";
import InvestmentPortfolio360Page from "./pages/investments/portfolio/InvestmentPortfolio360Page";
import InvestmentInstrumentsPage from "./pages/investments/instruments/InvestmentInstrumentsPage";
import InvestmentInstrument360Page from "./pages/investments/instruments/InvestmentInstrument360Page";
import InvestmentMastersPage from "./pages/investments/administration/InvestmentMastersPage";
import InvestmentOrdersPage from "./pages/investments/operations/InvestmentOrdersPage";
import InvestmentTradesPage from "./pages/investments/operations/InvestmentTradesPage";
import InvestmentTradeWizardPage from "./pages/investments/operations/InvestmentTradeWizardPage";
import InvestmentSettlementsPage from "./pages/investments/operations/InvestmentSettlementsPage";
import InvestmentIncomePage from "./pages/investments/operations/InvestmentIncomePage";
import InvestmentCorporateActionsPage from "./pages/investments/operations/InvestmentCorporateActionsPage";
import InvestmentInvestorsPage from "./pages/investments/capital/InvestmentInvestorsPage";
import InvestmentInvestor360Page from "./pages/investments/capital/InvestmentInvestor360Page";
import InvestmentCapitalPage from "./pages/investments/capital/InvestmentCapitalPage";
import InvestmentNavPerformancePage from "./pages/investments/performance/InvestmentNavPerformancePage";
import InvestmentReconciliationPage from "./pages/investments/operations/InvestmentReconciliationPage";
import InvestmentRiskCompliancePage from "./pages/investments/risk/InvestmentRiskCompliancePage";
import InvestmentIntelligencePage from "./pages/investments/intelligence/InvestmentIntelligencePage";
import CopilotWorkspacePage from "./pages/copilot/CopilotWorkspacePage";
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
        <Route path="/marketing" element={<Marketing />} />

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
            <Route path="/settings" element={withGuard("/settings", <Settings />)} />
            <Route
              path="/settings/company-settings"
              element={withGuard("/settings/company-settings", <CompanySettingsAdmin />)}
            />
            <Route
              path="/settings/company-finance-config"
              element={withGuard("/settings/company-finance-config", <CompanyFinanceConfig />)}
            />
            <Route
              path="/settings/system-health"
              element={withGuard("/settings/system-health", <SystemHealthDashboard />)}
            />
            <Route path="/profile" element={withGuard("/profile", <Profile />)} />
            <Route path="/copilot" element={withGuard("/copilot", <CopilotWorkspacePage />)} />
            {/* Finance Module Routes */}
            <Route path="/vendors" element={withGuard("/vendors", <Vendors />)} />
            <Route path="/treasury" element={withGuard("/treasury", <Treasury />)} />
            <Route path="/investments" element={<Navigate to="/investments/dashboard" replace />} />
            <Route path="/investments/dashboard" element={withGuard("/investments/dashboard", <InvestmentDashboardPage />)} />
            <Route path="/investments/portfolios" element={withGuard("/investments/portfolios", <InvestmentPortfoliosPage />)} />
            <Route path="/investments/portfolios/:id" element={withGuard("/investments/portfolios", <InvestmentPortfolio360Page />)} />
            <Route path="/investments/instruments" element={withGuard("/investments/instruments", <InvestmentInstrumentsPage />)} />
            <Route path="/investments/instruments/:id" element={withGuard("/investments/instruments", <InvestmentInstrument360Page />)} />
            <Route path="/investments/brokers" element={withGuard("/investments/brokers", <InvestmentMastersPage kind="brokers" />)} />
            <Route path="/investments/custodians" element={withGuard("/investments/custodians", <InvestmentMastersPage kind="custodians" />)} />
            <Route path="/investments/orders" element={withGuard("/investments/orders", <InvestmentOrdersPage />)} />
            <Route path="/investments/trades" element={withGuard("/investments/trades", <InvestmentTradesPage />)} />
            <Route path="/investments/trades/new" element={withGuard("/investments/trades", <InvestmentTradeWizardPage />)} />
            <Route path="/investments/settlements" element={withGuard("/investments/settlements", <InvestmentSettlementsPage />)} />
            <Route path="/investments/income" element={withGuard("/investments/income", <InvestmentIncomePage />)} />
            <Route path="/investments/corporate-actions" element={withGuard("/investments/corporate-actions", <InvestmentCorporateActionsPage />)} />
            <Route path="/investments/investors" element={withGuard("/investments/investors", <InvestmentInvestorsPage />)} />
            <Route path="/investments/investors/:id" element={withGuard("/investments/investors", <InvestmentInvestor360Page />)} />
            <Route path="/investments/capital" element={withGuard("/investments/capital", <InvestmentCapitalPage />)} />
            <Route path="/investments/nav-performance" element={withGuard("/investments/nav-performance", <InvestmentNavPerformancePage />)} />
            <Route path="/investments/reconciliation" element={withGuard("/investments/reconciliation", <InvestmentReconciliationPage />)} />
            <Route path="/investments/risk-compliance" element={withGuard("/investments/risk-compliance", <InvestmentRiskCompliancePage />)} />
            <Route path="/investments/intelligence" element={withGuard("/investments/intelligence", <InvestmentIntelligencePage />)} />
            <Route path="/investments/portfolio" element={withGuard("/investments/portfolio", <InvestmentPortfolioPage />)} />
            <Route path="/investments/assets/new" element={withGuard("/investments/assets/new", <InvestmentAssetFormPage />)} />
            <Route path="/investments/assets/:id/edit" element={withGuard("/investments/assets/:id/edit", <InvestmentAssetFormPage />)} />
            <Route path="/investments/assets/:id" element={withGuard("/investments/portfolio", <InvestmentAssetDetailPage />)} />
            <Route path="/investments/transactions" element={withGuard("/investments/transactions", <InvestmentTransactionsPage />)} />
            <Route path="/investments/dividends" element={withGuard("/investments/dividends", <InvestmentDividendsPage />)} />
            <Route path="/investments/distributions" element={withGuard("/investments/distributions", <InvestmentDistributionsPage />)} />
            <Route path="/investments/valuations" element={withGuard("/investments/valuations", <InvestmentValuationsPage />)} />
            <Route path="/investments/partner-allocations" element={withGuard("/investments/partner-allocations", <InvestmentAllocationsPage />)} />
            <Route path="/investments/reports" element={withGuard("/investments/reports", <InvestmentReportsPage />)} />
            <Route path="/investments/categories" element={withGuard("/investments/categories", <InvestmentCategoriesPage />)} />
            <Route path="/investments/settings" element={withGuard("/investments/settings", <InvestmentSettingsPage />)} />
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
              path="/finance/direct-purchase-invoices"
              element={withGuard("/finance/direct-purchase-invoices", <DirectPurchaseInvoicesPage />)}
            />
            <Route
              path="/finance/direct-purchase-invoices/new"
              element={withGuard("/finance/direct-purchase-invoices", <DirectPurchaseInvoicePage />)}
            />
            <Route
              path="/finance/direct-purchase-invoices/:id"
              element={withGuard("/finance/direct-purchase-invoices", <DirectPurchaseInvoicePage />)}
            />
            <Route
              path="/finance/prepaid-expenses/dashboard"
              element={withGuard("/finance/prepaid-expenses/dashboard", <PrepaidExpenseDashboardPage />)}
            />
            <Route
              path="/finance/prepaid-expenses/new"
              element={withGuard("/finance/prepaid-expenses/new", <PrepaidExpenseFormPage />)}
            />
            <Route
              path="/finance/prepaid-expenses/schedules"
              element={withGuard("/finance/prepaid-expenses/schedules", <PrepaidExpenseSchedulesPage />)}
            />
            <Route
              path="/finance/prepaid-expenses/posting-queue"
              element={withGuard("/finance/prepaid-expenses/posting-queue", <PrepaidExpensePostingQueuePage />)}
            />
            <Route
              path="/finance/prepaid-expenses/reconciliation"
              element={withGuard("/finance/prepaid-expenses/reconciliation", <PrepaidExpenseReconciliationPage />)}
            />
            <Route
              path="/finance/prepaid-expenses/reports"
              element={withGuard("/finance/prepaid-expenses/reports", <PrepaidExpenseReportsPage />)}
            />
            <Route
              path="/finance/prepaid-expenses/settings"
              element={withGuard("/finance/prepaid-expenses/settings", <PrepaidExpenseSettingsPage />)}
            />
            <Route
              path="/finance/prepaid-expenses/:id/edit"
              element={withGuard("/finance/prepaid-expenses", <PrepaidExpenseFormPage />)}
            />
            <Route
              path="/finance/prepaid-expenses/:id"
              element={withGuard("/finance/prepaid-expenses", <PrepaidExpenseDetailPage />)}
            />
            <Route
              path="/finance/prepaid-expenses"
              element={withGuard("/finance/prepaid-expenses", <PrepaidExpenseRegisterPage />)}
            />
            <Route
              path="/finance/lease-revenue/dashboard"
              element={withGuard("/finance/lease-revenue/dashboard", <LeaseRevenueDashboardPage />)}
            />
            <Route
              path="/finance/lease-revenue/new"
              element={withGuard("/finance/lease-revenue/new", <LeaseRevenueFormPage />)}
            />
            <Route
              path="/finance/lease-revenue/schedules"
              element={withGuard("/finance/lease-revenue/schedules", <LeaseRevenueSchedulesPage />)}
            />
            <Route
              path="/finance/lease-revenue/posting-queue"
              element={withGuard("/finance/lease-revenue/posting-queue", <LeaseRevenuePostingQueuePage />)}
            />
            <Route
              path="/finance/lease-revenue/reconciliation"
              element={withGuard("/finance/lease-revenue/reconciliation", <LeaseRevenueReconciliationPage />)}
            />
            <Route
              path="/finance/lease-revenue/reports"
              element={withGuard("/finance/lease-revenue/reports", <LeaseRevenueReportsPage />)}
            />
            <Route
              path="/finance/lease-revenue/settings"
              element={withGuard("/finance/lease-revenue/settings", <LeaseRevenueSettingsPage />)}
            />
            <Route
              path="/finance/lease-revenue/:id/edit"
              element={withGuard("/finance/lease-revenue", <LeaseRevenueFormPage />)}
            />
            <Route
              path="/finance/lease-revenue/:id"
              element={withGuard("/finance/lease-revenue", <LeaseRevenueDetailPage />)}
            />
            <Route
              path="/finance/lease-revenue"
              element={withGuard("/finance/lease-revenue", <LeaseRevenueRegisterPage />)}
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
            <Route path="/people/payroll" element={withGuard("/people/payroll", <PayrollHubPage />)} />
            <Route path="/people/payroll/organization" element={withGuard("/people/payroll", <PayrollOrganizationPage />)} />
            <Route path="/people/payroll/employees" element={withGuard("/people/payroll", <PayrollEmployeesPage />)} />
            <Route path="/people/payroll/employees/new" element={withGuard("/people/payroll", <PayrollEmployeePage />)} />
            <Route path="/people/payroll/employees/:id/edit" element={withGuard("/people/payroll", <PayrollEmployeePage />)} />
            <Route path="/people/payroll/employees/:id" element={withGuard("/people/payroll", <PayrollEmployee360Page />)} />
            <Route path="/people/payroll/attendance-control" element={withGuard("/people/payroll", <PayrollAttendanceControlPage />)} />
            <Route path="/people/payroll/runs/:id" element={withGuard("/people/payroll", <PayrollRunDetailPage />)} />
            <Route path="/people/payroll/wps/batches/:id" element={withGuard("/people/payroll", <PayrollWpsBatchDetailPage />)} />
            <Route path="/people/payroll/final-settlements/:id" element={withGuard("/people/payroll", <PayrollSettlementDetailPage />)} />
            <Route path="/people/payroll/reports" element={withGuard("/people/payroll", <PayrollReportsCenterPage />)} />
            <Route path="/people/payroll/salary-structures" element={withGuard("/people/payroll", <PayrollSalaryStructuresPage />)} />
            <Route path="/people/payroll/components" element={withGuard("/people/payroll", <PayrollComponentsPage />)} />
            <Route path="/people/payroll/leave-policies" element={withGuard("/people/payroll", <PayrollLeavePoliciesPage />)} />
            <Route path="/people/payroll/shifts" element={withGuard("/people/payroll", <PayrollShiftsPage />)} />
            <Route path="/people/payroll/documents" element={withGuard("/people/payroll", <PayrollDocumentsPage />)} />
            <Route path="/people/payroll/operations" element={withGuard("/people/payroll", <PayrollOperationsPage />)} />
            <Route path="/people/payroll/leave-opening-balances" element={withGuard("/people/payroll", <PayrollLeaveOpeningBalancesPage />)} />
            <Route path="/people/payroll/leave-dashboard" element={withGuard("/people/payroll", <PayrollLeaveDashboardPage />)} />
            <Route path="/people/payroll/leave-applications" element={withGuard("/people/payroll", <PayrollLeaveApplicationsPage />)} />
            <Route path="/people/payroll/attendance-logs" element={withGuard("/people/payroll", <PayrollAttendanceLogsPage />)} />
            <Route path="/people/payroll/staff-attendance" element={withGuard("/people/payroll", <PayrollStaffAttendancePage />)} />
            <Route path="/people/payroll/labour-timesheets" element={withGuard("/people/payroll", <PayrollLabourTimesheetsPage />)} />
            <Route path="/people/payroll/overtime" element={withGuard("/people/payroll", <PayrollOvertimePage />)} />
            <Route path="/people/payroll/attendance-periods" element={withGuard("/people/payroll", <PayrollAttendancePeriodsPage />)} />
            <Route path="/people/payroll/monthly-summary" element={withGuard("/people/payroll", <PayrollMonthlySummaryPage />)} />
            <Route path="/people/payroll/payroll-readiness" element={withGuard("/people/payroll", <PayrollReadinessPage />)} />
            <Route path="/people/payroll/calculation" element={withGuard("/people/payroll", <PayrollCalculationPage />)} />
            <Route path="/people/payroll/payroll-periods" element={withGuard("/people/payroll", <PayrollPeriodsPage />)} />
            <Route path="/people/payroll/runs" element={withGuard("/people/payroll", <PayrollRunsPage />)} />
            <Route path="/people/payroll/adjustments" element={withGuard("/people/payroll", <PayrollAdjustmentsPage />)} />
            <Route path="/people/payroll/loans" element={withGuard("/people/payroll", <PayrollLoansPage />)} />
            <Route path="/people/payroll/register" element={withGuard("/people/payroll", <PayrollRegisterPage />)} />
            <Route path="/people/payroll/variance" element={withGuard("/people/payroll", <PayrollVariancePage />)} />
            <Route path="/people/payroll/wps" element={withGuard("/people/payroll", <PayrollWpsDashboardPage />)} />
            <Route path="/people/payroll/wps/batches" element={withGuard("/people/payroll", <PayrollWpsBatchesPage />)} />
            <Route path="/people/payroll/wps/compliance" element={withGuard("/people/payroll", <PayrollWpsCompliancePage />)} />
            <Route path="/people/payroll/wps/configuration" element={withGuard("/people/payroll", <PayrollWpsConfigurationPage />)} />
            <Route path="/people/payroll/emiratisation" element={withGuard("/people/payroll", <PayrollEmiratisationPage />)} />
            <Route path="/people/payroll/gpssa" element={withGuard("/people/payroll", <PayrollGpssaPage />)} />
            <Route path="/people/payroll/final-settlement" element={withGuard("/people/payroll", <PayrollFinalSettlementDashboardPage />)} />
            <Route path="/people/payroll/separations" element={withGuard("/people/payroll", <PayrollSeparationsPage />)} />
            <Route path="/people/payroll/final-settlements" element={withGuard("/people/payroll", <PayrollFinalSettlementsPage />)} />
            <Route path="/people/payroll/eos-configuration" element={withGuard("/people/payroll", <PayrollEosConfigurationPage />)} />
            <Route path="/people/payroll/settlement-register" element={withGuard("/people/payroll", <PayrollSettlementRegisterPage />)} />
            <Route path="/people/payroll/finance" element={withGuard("/people/payroll", <PayrollFinanceDashboardPage />)} />
            <Route path="/people/payroll/account-config" element={withGuard("/people/payroll", <PayrollAccountConfigPage />)} />
            <Route path="/people/payroll/employee-ledger" element={withGuard("/people/payroll", <PayrollEmployeeLedgerPage />)} />
            <Route path="/people/payroll/posting-register" element={withGuard("/people/payroll", <PayrollPostingRegisterPage />)} />
            <Route path="/people/payroll/finance-reconciliation" element={withGuard("/people/payroll", <PayrollFinanceReconciliationPage />)} />
            <Route path="/people/payroll/documents-hub" element={withGuard("/people/payroll", <PayrollDocumentsHubPage />)} />
            <Route path="/people/payroll/payslips" element={withGuard("/people/payroll", <PayrollPayslipsPage />)} />
            <Route path="/people/payroll/salary-certificates" element={withGuard("/people/payroll", <PayrollSalaryCertificatesPage />)} />
            <Route path="/people/payroll/settlement-documents" element={withGuard("/people/payroll", <PayrollSettlementDocumentsPage />)} />
            <Route path="/people/payroll/exports" element={withGuard("/people/payroll", <PayrollExportsPage />)} />
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
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="noblex-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <CompanyProvider>
            <SettingsProvider>
              <AppRoutes />
            </SettingsProvider>
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
