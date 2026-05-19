import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TreasuryDashboard from '@/components/finance/treasury/TreasuryDashboard';
import BankAccountList from '@/components/finance/treasury/BankAccountList';
import BankReconciliation from '@/components/finance/treasury/BankReconciliation';
import BankStatementImport from '@/components/finance/treasury/BankStatementImport';
import CashFlowForecast from '@/components/finance/treasury/CashFlowForecast';
import AutoReconciliation from '@/components/finance/treasury/AutoReconciliation';
import InvestmentList from '@/components/finance/treasury/InvestmentList';
import TreasuryReportsDashboard from '@/components/finance/treasury/TreasuryReportsDashboard';
import {
  LayoutDashboard,
  Building2,
  RefreshCw,
  Upload,
  TrendingUp,
  Zap,
  PieChart,
  BarChart3,
} from 'lucide-react';
import FinancePDCActions from '@/components/finance/FinancePDCActions';

export default function TreasuryPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex-1">
          <h1 className="uiux-page-title">Treasury Management</h1>
          <p className="uiux-page-subtitle">
            Manage bank accounts, reconciliations, and cash flow
          </p>
          <FinancePDCActions className="mt-3" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Reconcile</span>
          </TabsTrigger>
          <TabsTrigger value="auto-reconcile" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Auto-Reconcile</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </TabsTrigger>
          <TabsTrigger value="investments" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Investments</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Forecast</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <TreasuryDashboard />
        </TabsContent>

        <TabsContent value="accounts" className="mt-6">
          <BankAccountList />
        </TabsContent>

        <TabsContent value="reconciliation" className="mt-6">
          <BankReconciliation />
        </TabsContent>

        <TabsContent value="auto-reconcile" className="mt-6">
          <AutoReconciliation />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <BankStatementImport />
        </TabsContent>

        <TabsContent value="investments" className="mt-6">
          <InvestmentList />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <TreasuryReportsDashboard />
        </TabsContent>

        <TabsContent value="forecast" className="mt-6">
          <CashFlowForecast />
        </TabsContent>
      </Tabs>
    </div>
  );
}

