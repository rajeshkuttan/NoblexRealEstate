import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BudgetVarianceAnalysis from '@/components/finance/budget/BudgetVarianceAnalysis';
import BudgetAlertSettings from '@/components/finance/budget/BudgetAlertSettings';
import BudgetApprovalWorkflow from '@/components/finance/budget/BudgetApprovalWorkflow';
import BudgetTemplates from '@/components/finance/budget/BudgetTemplates';
import {
  TrendingUp,
  Bell,
  CheckCircle,
  FileText,
} from 'lucide-react';

export default function BudgetPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('variance');

  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header">
        <div>
          <h1 className="uiux-page-title">{t("finance.budget.title")}</h1>
          <p className="uiux-page-subtitle">
            {t("finance.budget.subtitle")}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="variance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Variance
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approval
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="variance" className="mt-6">
          <BudgetVarianceAnalysis />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <BudgetAlertSettings />
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <BudgetApprovalWorkflow />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <BudgetTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
}

