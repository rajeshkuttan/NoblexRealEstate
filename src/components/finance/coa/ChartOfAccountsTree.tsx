import { useState } from 'react';
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
} from 'lucide-react';

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
}

export default function ChartOfAccountsTree({
  onEdit,
  onDelete,
  onAdd,
}: ChartOfAccountsTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [searchTerm, setSearchTerm] = useState('');

  // Mock hierarchical data
  const mockAccounts: Account[] = [
    {
      id: 1,
      accountCode: '1000',
      accountName: 'Assets',
      accountType: 'asset',
      balance: 500000,
      children: [
        {
          id: 11,
          accountCode: '1100',
          accountName: 'Current Assets',
          accountType: 'asset',
          parentAccountId: 1,
          balance: 300000,
          children: [
            {
              id: 111,
              accountCode: '1110',
              accountName: 'Cash and Bank',
              accountType: 'asset',
              parentAccountId: 11,
              balance: 150000,
              isReconcilable: true,
            },
            {
              id: 112,
              accountCode: '1120',
              accountName: 'Accounts Receivable',
              accountType: 'asset',
              parentAccountId: 11,
              balance: 150000,
            },
          ],
        },
        {
          id: 12,
          accountCode: '1200',
          accountName: 'Fixed Assets',
          accountType: 'asset',
          parentAccountId: 1,
          balance: 200000,
        },
      ],
    },
    {
      id: 2,
      accountCode: '2000',
      accountName: 'Liabilities',
      accountType: 'liability',
      balance: 200000,
      children: [
        {
          id: 21,
          accountCode: '2100',
          accountName: 'Current Liabilities',
          accountType: 'liability',
          parentAccountId: 2,
          balance: 150000,
          children: [
            {
              id: 211,
              accountCode: '2110',
              accountName: 'Accounts Payable',
              accountType: 'liability',
              parentAccountId: 21,
              balance: 100000,
            },
            {
              id: 212,
              accountCode: '2120',
              accountName: 'VAT Payable',
              accountType: 'liability',
              parentAccountId: 21,
              balance: 50000,
              taxCategory: 'vat_applicable',
            },
          ],
        },
      ],
    },
    {
      id: 3,
      accountCode: '3000',
      accountName: 'Equity',
      accountType: 'equity',
      balance: 300000,
    },
    {
      id: 4,
      accountCode: '4000',
      accountName: 'Revenue',
      accountType: 'revenue',
      balance: 750000,
      children: [
        {
          id: 41,
          accountCode: '4100',
          accountName: 'Rental Income',
          accountType: 'revenue',
          parentAccountId: 4,
          balance: 750000,
          taxCategory: 'vat_exempt',
        },
      ],
    },
    {
      id: 5,
      accountCode: '5000',
      accountName: 'Expenses',
      accountType: 'expense',
      balance: 250000,
      children: [
        {
          id: 51,
          accountCode: '5100',
          accountName: 'Operating Expenses',
          accountType: 'expense',
          parentAccountId: 5,
          balance: 150000,
        },
        {
          id: 52,
          accountCode: '5200',
          accountName: 'Administrative Expenses',
          accountType: 'expense',
          parentAccountId: 5,
          balance: 100000,
        },
      ],
    },
  ];

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

  const filteredAccounts = filterAccounts(mockAccounts);

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
          {filteredAccounts.length === 0 ? (
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

