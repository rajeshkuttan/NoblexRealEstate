import { useState, useEffect } from 'react';
import { reconciliationsAPI, bankAccountsAPI } from '@/services/api';
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
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Plus,
} from 'lucide-react';

interface Reconciliation {
  id: number;
  bankAccountId: number;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
  };
  reconciliationDate: string;
  statementBalance: number;
  systemBalance: number;
  difference: number;
  status: string;
}

export default function BankReconciliation() {
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [bankAccountFilter, setBankAccountFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchReconciliations();
    fetchBankAccounts();
    fetchStats();
  }, [page, bankAccountFilter, statusFilter]);

  const fetchReconciliations = async () => {
    try {
      setLoading(true);
      const { data } = await reconciliationsAPI.getAll({
        page,
        limit: 10,
        bankAccountId: bankAccountFilter || undefined,
        status: statusFilter || undefined,
      });
      setReconciliations(data.data.reconciliations || []);
      setTotalPages(data.data.pagination?.totalPages || 1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch reconciliations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data } = await bankAccountsAPI.getAll({ limit: 100, status: 'active' });
      setBankAccounts(data.data.bankAccounts || []);
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await reconciliationsAPI.getStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'default',
      approved: 'default',
      rejected: 'destructive',
    };
    const colors: { [key: string]: string } = {
      pending: 'bg-gray-500',
      in_progress: 'bg-yellow-500',
      completed: 'bg-blue-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
    };
    const icons: { [key: string]: any } = {
      pending: Clock,
      in_progress: AlertCircle,
      completed: CheckCircle,
      approved: CheckCircle,
      rejected: XCircle,
    };
    const Icon = icons[status] || Clock;
    
    return (
      <Badge variant={variants[status] || 'default'} className={`${colors[status]} flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const validAmount = amount && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(validAmount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  const bankAccountOptions = [
    { value: 'all', label: 'All Bank Accounts' },
    ...bankAccounts.map((account) => ({
      value: account.id.toString(),
      label: `${account.bankName} - ${account.accountNumber}`,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reconciliations</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReconciliations || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingCount || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.inProgressCount || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.completedCount || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bank Reconciliations</CardTitle>
              <CardDescription>
                Match bank statements with internal records
              </CardDescription>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Start Reconciliation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex gap-4">
            <SearchableSelect
              value={bankAccountFilter || 'all'}
              onValueChange={(value) => {
                setBankAccountFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
              options={bankAccountOptions}
              placeholder="All Bank Accounts"
              searchPlaceholder="Search bank account..."
              className="w-[250px]"
            />

            <SearchableSelect
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                setStatusFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
              options={statusOptions}
              placeholder="All Status"
              searchPlaceholder="Search status..."
              className="w-[180px]"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-8 text-center">Loading reconciliations...</div>
          ) : reconciliations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No reconciliations found. Start your first reconciliation to get started.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Bank / Account</TableHead>
                    <TableHead className="text-right">Statement Balance</TableHead>
                    <TableHead className="text-right">System Balance</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliations.map((reconciliation) => (
                    <TableRow key={reconciliation.id}>
                      <TableCell>{formatDate(reconciliation.reconciliationDate)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {reconciliation.bankAccount?.bankName || 'N/A'}
                          </div>
                          <div className="text-muted-foreground font-mono text-xs">
                            {reconciliation.bankAccount?.accountNumber || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(reconciliation.statementBalance)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(reconciliation.systemBalance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {reconciliation.difference !== 0 ? (
                          <span className="font-medium text-red-600">
                            {formatCurrency(Math.abs(reconciliation.difference))}
                          </span>
                        ) : (
                          <span className="font-medium text-green-600">
                            {formatCurrency(0)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(reconciliation.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
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
    </div>
  );
}

