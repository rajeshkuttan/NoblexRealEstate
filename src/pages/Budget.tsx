import { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('variance');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Budget Management</h1>
        <p className="text-muted-foreground">
          Monitor budgets, set alerts, and manage approval workflows
        </p>
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

