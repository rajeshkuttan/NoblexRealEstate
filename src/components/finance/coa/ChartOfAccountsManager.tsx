import { useState } from 'react';
import ChartOfAccountsTree from './ChartOfAccountsTree';
import { AccountForm } from './AccountForm';
import { AccountDetails } from './AccountDetails';

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
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [parentAccountId, setParentAccountId] = useState<number | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdd = (parentId?: number) => {
    setParentAccountId(parentId);
    setSelectedAccount(null);
    setShowForm(true);
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setParentAccountId(undefined);
    setShowForm(true);
  };

  const handleDelete = (account: Account) => {
    if (confirm(`Are you sure you want to delete account "${account.accountName}"?`)) {
      // Handle delete logic
      console.log('Delete account:', account.id);
    }
  };

  const handleView = (account: Account) => {
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
      <ChartOfAccountsTree
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        refreshKey={refreshKey + (externalRefreshKey || 0)}
      />

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

