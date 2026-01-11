import { useState, useEffect } from 'react';
import { bankAccountsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Building2,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { BankAccountForm } from './BankAccountForm';
import { BankAccountDetails } from './BankAccountDetails';

interface BankAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban?: string;
  currency: string;
  currentBalance: number;
  status: 'active' | 'inactive' | 'closed';
}

export default function BankAccountList() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBankAccounts();
    fetchStats();
  }, [page, search, statusFilter, currencyFilter]);

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      const { data } = await bankAccountsAPI.getAll({
        page,
        limit: 10,
        search,
        status: statusFilter || undefined,
        currency: currencyFilter || undefined,
      });
      setBankAccounts(data.data.bankAccounts);
      setTotalPages(data.data.pagination.totalPages);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch bank accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await bankAccountsAPI.getStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bank account?')) return;

    try {
      await bankAccountsAPI.delete(id);
      toast({
        title: 'Success',
        description: 'Bank account deleted successfully',
      });
      fetchBankAccounts();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete bank account',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setShowForm(true);
  };

  const handleView = (account: BankAccount) => {
    setSelectedAccount(account);
    setShowDetails(true);
  };

  const handleFormClose = (refresh?: boolean) => {
    setShowForm(false);
    setSelectedAccount(null);
    if (refresh) {
      fetchBankAccounts();
      fetchStats();
    }
  };

  const handleDetailsClose = () => {
    setShowDetails(false);
    setSelectedAccount(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      active: 'default',
      inactive: 'secondary',
      closed: 'destructive',
    };
    const colors: { [key: string]: string } = {
      active: 'bg-green-500',
      inactive: 'bg-gray-500',
      closed: 'bg-red-500',
    };
    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | undefined | null, currency: string = 'AED') => {
    const validAmount = amount && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: currency,
    }).format(validAmount);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAccounts}</div>
              <p className="text-xs text-muted-foreground">
                Active: {stats.activeAccounts}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalBalance, 'AED')}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all currencies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions (Today)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.transactionsToday || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.transactionsAmountToday || 0, 'AED')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bank Accounts</CardTitle>
              <CardDescription>
                Manage your bank accounts and balances
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                setStatusFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={currencyFilter || 'all'}
              onValueChange={(value) => {
                setCurrencyFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-8 text-center">Loading bank accounts...</div>
          ) : bankAccounts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No bank accounts found. Add your first account to get started.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bank Name</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.bankName}
                      </TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {account.accountNumber}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {account.iban || 'N/A'}
                      </TableCell>
                      <TableCell>{account.currency}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(account.currentBalance, account.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(account.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleView(account)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(account)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(account.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bank Account Form Dialog */}
      {showForm && (
        <BankAccountForm
          account={selectedAccount}
          onClose={handleFormClose}
        />
      )}

      {/* Bank Account Details Dialog */}
      {showDetails && selectedAccount && (
        <BankAccountDetails
          accountId={selectedAccount.id}
          onClose={handleDetailsClose}
        />
      )}
    </div>
  );
}

