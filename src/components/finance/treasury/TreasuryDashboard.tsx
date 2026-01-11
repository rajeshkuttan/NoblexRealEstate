import { useState, useEffect } from 'react';
import { bankAccountsAPI, bankTransactionsAPI, reconciliationsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { formatCurrency as formatCurrencySafe, safeParseFloat } from '@/utils/currencyUtils';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Building2,
  ArrowRight,
  Plus,
  Upload,
  RefreshCw,
} from 'lucide-react';

interface CashPosition {
  totalBalance: number;
  balanceByCurrency: {
    currency: string;
    balance: number;
    accountCount: number;
  }[];
}

interface BankAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  currency: string;
  currentBalance: number;
  status: string;
}

interface RecentTransaction {
  id: number;
  bankAccountId: number;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
  };
  transactionDate: string;
  description: string;
  amount: number;
  transactionType: 'debit' | 'credit';
  isReconciled: boolean;
}

export default function TreasuryDashboard() {
  const [cashPosition, setCashPosition] = useState<CashPosition | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [reconciliationStats, setReconciliationStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      bankAccountId: '',
      transactionDate: new Date().toISOString().split('T')[0],
      description: '',
      reference: '',
      amount: '',
      currency: 'AED',
      transactionType: 'credit',
      notes: '',
    },
  });

  const selectedBankAccountId = watch('bankAccountId');
  const transactionType = watch('transactionType');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCashPosition(),
        fetchBankAccounts(),
        fetchRecentTransactions(),
        fetchReconciliationStats(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCashPosition = async () => {
    try {
      const { data } = await bankAccountsAPI.getCashPosition();
      setCashPosition(data.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch cash position',
        variant: 'destructive',
      });
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data } = await bankAccountsAPI.getAll({ limit: 10, status: 'active' });
      setBankAccounts(data.data.bankAccounts || []);
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const { data } = await bankTransactionsAPI.getAll({ limit: 10 });
      setRecentTransactions(data.data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch recent transactions:', error);
    }
  };

  const fetchReconciliationStats = async () => {
    try {
      const { data } = await reconciliationsAPI.getStats();
      setReconciliationStats(data.data);
    } catch (error) {
      console.error('Failed to fetch reconciliation stats:', error);
    }
  };

  const formatCurrency = (amount: number | undefined | null, currency: string = 'AED') => {
    return formatCurrencySafe(amount, currency);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  const onSubmitTransaction = async (data: any) => {
    setIsSubmitting(true);
    try {
      await bankTransactionsAPI.create({
        bankAccountId: parseInt(data.bankAccountId),
        transactionDate: data.transactionDate,
        description: data.description,
        reference: data.reference || null,
        amount: safeParseFloat(data.amount, 0),
        currency: data.currency,
        transactionType: data.transactionType,
        notes: data.notes || null,
      });

      toast({
        title: 'Success',
        description: 'Transaction created successfully',
      });

      setIsNewTransactionOpen(false);
      reset();
      fetchDashboardData(); // Refresh all data
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create transaction',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
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

  if (loading) {
    return (
      <div className="py-8 text-center">
        Loading treasury dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Treasury Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time cash position and bank account overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import Statement
          </Button>
          <Button variant="outline" onClick={() => setIsNewTransactionOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Cash Position Cards */}
      {cashPosition && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Cash Position
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(cashPosition.totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Across {cashPosition.balanceByCurrency?.length || 0} currencies
              </p>
            </CardContent>
          </Card>

          {(cashPosition.balanceByCurrency || []).slice(0, 2).map((currencyData) => (
            <Card key={currencyData.currency}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {currencyData.currency}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(currencyData.balance, currencyData.currency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currencyData.accountCount} account
                  {currencyData.accountCount !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Additional Currency Cards */}
      {cashPosition && (cashPosition.balanceByCurrency?.length || 0) > 2 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(cashPosition.balanceByCurrency || []).slice(2).map((currencyData) => (
            <Card key={currencyData.currency}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {currencyData.currency}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(currencyData.balance, currencyData.currency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currencyData.accountCount} account
                  {currencyData.accountCount !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reconciliation Status */}
      {reconciliationStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unreconciled Transactions
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {reconciliationStats.unreconciledCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requiring attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Reconciliations
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {reconciliationStats.pendingCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                In progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed This Month
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {reconciliationStats.completedThisMonth || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Reconciliations
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bank Accounts</CardTitle>
              <CardDescription>
                Active bank accounts and balances
              </CardDescription>
            </div>
            <Button variant="link">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bankAccounts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No bank accounts found. Add your first account to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {account.bankName}
                      </div>
                    </TableCell>
                    <TableCell>{account.accountName}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {account.accountNumber}
                    </TableCell>
                    <TableCell>{account.currency}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(account.currentBalance, account.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(account.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Last 10 bank transactions
              </CardDescription>
            </div>
            <Button variant="link">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No recent transactions found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Bank / Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reconciled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {transaction.bankAccount?.bankName || 'N/A'}
                        </div>
                        <div className="text-muted-foreground font-mono text-xs">
                          {transaction.bankAccount?.accountNumber || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.transactionType === 'credit' ? 'default' : 'secondary'
                        }
                        className={
                          transaction.transactionType === 'credit'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }
                      >
                        {transaction.transactionType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          transaction.transactionType === 'credit'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {transaction.transactionType === 'credit' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      {transaction.isReconciled ? (
                        <Badge variant="default" className="bg-green-500">
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-500">
                          No
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Transaction Dialog */}
      <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>New Bank Transaction</DialogTitle>
            <DialogDescription>
              Create a new bank transaction record
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitTransaction)}>
            <div className="grid gap-4 py-4">
              {/* Bank Account */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bankAccountId" className="text-right">
                  Bank Account
                </Label>
                <div className="col-span-3">
                  <Select
                    value={selectedBankAccountId}
                    onValueChange={(value) => setValue('bankAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.bankName} - {account.accountName} ({account.accountNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Transaction Date */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transactionDate" className="text-right">
                  Date
                </Label>
                <Input
                  id="transactionDate"
                  type="date"
                  className="col-span-3"
                  {...register('transactionDate', { required: true })}
                />
              </div>

              {/* Transaction Type */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transactionType" className="text-right">
                  Type
                </Label>
                <div className="col-span-3">
                  <Select
                    value={transactionType}
                    onValueChange={(value) => setValue('transactionType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Credit (Money In)</SelectItem>
                      <SelectItem value="debit">Debit (Money Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amount */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="col-span-3"
                  {...register('amount', { required: true })}
                />
              </div>

              {/* Currency */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currency" className="text-right">
                  Currency
                </Label>
                <Input
                  id="currency"
                  placeholder="AED"
                  className="col-span-3"
                  {...register('currency')}
                />
              </div>

              {/* Description */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  placeholder="Transaction description"
                  className="col-span-3"
                  {...register('description', { required: true })}
                />
              </div>

              {/* Reference */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reference" className="text-right">
                  Reference
                </Label>
                <Input
                  id="reference"
                  placeholder="Transaction reference (optional)"
                  className="col-span-3"
                  {...register('reference')}
                />
              </div>

              {/* Notes */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes (optional)"
                  className="col-span-3"
                  rows={3}
                  {...register('notes')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNewTransactionOpen(false);
                  reset();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

