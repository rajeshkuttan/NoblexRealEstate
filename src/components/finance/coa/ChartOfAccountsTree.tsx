import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Edit,
  Trash2,
  FolderOpen,
  FileText,
  Loader2,
} from 'lucide-react';
import { chartOfAccountsAPI } from '@/services/api';

interface Account {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountId?: number;
  children?: Account[];
  balance?: number;
  isReconcilable?: boolean;
  taxCategory?: string;
}

interface ChartOfAccountsTreeProps {
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
  onAdd?: (parentId?: number) => void;
  refreshKey?: number;
}

export default function ChartOfAccountsTree({
  onEdit,
  onDelete,
  onAdd,
  refreshKey,
}: ChartOfAccountsTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Transform API response: rename 'subAccounts' to 'children' recursively
  const transformAccounts = (apiAccounts: any[]): Account[] => {
    return apiAccounts.map((acc) => ({
      id: acc.id,
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      accountType: acc.accountType,
      parentAccountId: acc.parentAccountId,
      balance: acc.balance ? parseFloat(acc.balance) : 0,
      isReconcilable: acc.isReconcilable,
      taxCategory: acc.taxCategory,
      children: acc.subAccounts && acc.subAccounts.length > 0
        ? transformAccounts(acc.subAccounts)
        : undefined,
    }));
  };

  // Fetch accounts from API
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await chartOfAccountsAPI.getHierarchy();
      const data = response.data?.data || [];
      const transformed = transformAccounts(data);
      setAccounts(transformed);
      // Auto-expand top-level nodes
      const topIds = new Set<number>(transformed.map((a: Account) => a.id));
      setExpandedNodes(topIds);
    } catch (error) {
      console.error('Error fetching chart of accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [refreshKey]);

  const toggleNode = (id: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const getAccountTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      asset: 'bg-green-500',
      liability: 'bg-red-500',
      equity: 'bg-blue-500',
      revenue: 'bg-purple-500',
      expense: 'bg-orange-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

  const filterAccounts = (accounts: Account[]): Account[] => {
    if (!searchTerm) return accounts;

    const filtered: Account[] = [];
    for (const account of accounts) {
      const matches =
        account.accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.accountName.toLowerCase().includes(searchTerm.toLowerCase());

      if (matches) {
        filtered.push(account);
      } else if (account.children) {
        const filteredChildren = filterAccounts(account.children);
        if (filteredChildren.length > 0) {
          filtered.push({ ...account, children: filteredChildren });
        }
      }
    }
    return filtered;
  };

  const renderAccount = (account: Account, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    const indent = level * 24;

    return (
      <div key={account.id}>
        <div
          className="flex items-center justify-between py-2 px-3 hover:bg-muted rounded-md group"
          style={{ paddingLeft: `${indent + 12}px` }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(account.id)}
                className="p-1 hover:bg-muted-foreground/10 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}

            {hasChildren ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{account.accountCode}</span>
                <span className="text-sm">{account.accountName}</span>
                <Badge
                  variant="secondary"
                  className={`${getAccountTypeColor(account.accountType)} text-white text-xs`}
                >
                  {account.accountType.toUpperCase()}
                </Badge>
                {account.isReconcilable && (
                  <Badge variant="outline" className="text-xs">
                    Reconcilable
                  </Badge>
                )}
                {account.taxCategory && (
                  <Badge variant="outline" className="text-xs">
                    {account.taxCategory.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>

            {account.balance !== undefined && (
              <div className="text-sm font-medium text-right min-w-[120px]">
                {formatCurrency(account.balance)}
              </div>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAdd?.(account.id)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit?.(account)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(account)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {account.children!.map((child) => renderAccount(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredAccounts = filterAccounts(accounts);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Chart of Accounts</CardTitle>
          <Button onClick={() => onAdd?.()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading accounts...</span>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No accounts found matching your search
            </div>
          ) : (
            filteredAccounts.map((account) => renderAccount(account))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

