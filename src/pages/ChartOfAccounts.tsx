import ChartOfAccountsManager from '@/components/finance/coa/ChartOfAccountsManager';

export default function ChartOfAccountsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chart of Accounts</h1>
        <p className="text-muted-foreground">
          Manage your accounting structure and account hierarchy
        </p>
      </div>

      <ChartOfAccountsManager />
    </div>
  );
}

