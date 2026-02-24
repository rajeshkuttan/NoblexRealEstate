import { useState } from 'react';
import { toast } from 'sonner';
import { chartOfAccountsAPI } from '@/services/api';
import { cacheService } from '@/services/cache';
import ChartOfAccountsTree from './ChartOfAccountsTree';
import ChartOfAccountsList from './ChartOfAccountsList';
import { AccountForm } from './AccountForm';
import { AccountDetails } from './AccountDetails';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, List } from 'lucide-react';

interface Account {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountId?: number;
}

interface ChartOfAccountsManagerProps {
  externalRefreshKey?: number;
}

export default function ChartOfAccountsManager({ externalRefreshKey }: ChartOfAccountsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [parentAccountId, setParentAccountId] = useState<number | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdd = (parentId?: number) => {
    setParentAccountId(parentId);
    setSelectedAccount(null);
    setShowForm(true);
  };

  const handleEdit = (account: any) => {
    setSelectedAccount(account);
    setParentAccountId(undefined);
    setShowForm(true);
  };

  const handleDelete = async (account: any) => {
    if (window.confirm(`Are you sure you want to delete account "${account.accountName}"? This will also delete all sub-accounts.`)) {
      try {
        await chartOfAccountsAPI.delete(account.id);
        toast.success(`Account "${account.accountName}" deleted successfully`);
        cacheService.invalidatePattern('/chart-of-accounts');
        setRefreshKey((prev) => prev + 1);
      } catch (error: any) {
        console.error('Error deleting account:', error);
        toast.error(error.response?.data?.message || 'Failed to delete account');
      }
    }
  };

  const handleView = (account: any) => {
    setSelectedAccount(account);
    setShowDetails(true);
  };

  const handleFormClose = (refresh?: boolean) => {
    setShowForm(false);
    setSelectedAccount(null);
    setParentAccountId(undefined);
    if (refresh) {
      setRefreshKey((prev) => prev + 1);
    }
  };

  const handleDetailsClose = () => {
    setShowDetails(false);
    setSelectedAccount(null);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="hierarchy" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="hierarchy" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Hierarchy
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              All Accounts
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="hierarchy" className="mt-0">
          <ChartOfAccountsTree
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            refreshKey={refreshKey + (externalRefreshKey || 0)}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          <ChartOfAccountsList
            onAdd={() => handleAdd()}
            onEdit={handleEdit}
            onDelete={handleDelete}
            refreshKey={refreshKey + (externalRefreshKey || 0)}
          />
        </TabsContent>
      </Tabs>

      {showForm && (
        <AccountForm
          account={selectedAccount}
          parentAccountId={parentAccountId}
          onClose={handleFormClose}
        />
      )}

      {showDetails && selectedAccount && (
        <AccountDetails
          accountId={selectedAccount.id}
          onClose={handleDetailsClose}
        />
      )}
    </div>
  );
}

