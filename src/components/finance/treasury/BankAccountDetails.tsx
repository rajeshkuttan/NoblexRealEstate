import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, TrendingUp, TrendingDown, Activity, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { bankAccountsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface BankAccountDetailsProps {
  accountId: number;
  onClose: () => void;
}

export function BankAccountDetails({ accountId, onClose }: BankAccountDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAccountDetails();
  }, [accountId]);

  const fetchAccountDetails = async () => {
    try {
      const response = await bankAccountsAPI.getById(accountId);

      if (response.data.success) {
        setAccount(response.data.data);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch account details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null, currency: string = 'AED') => {
    const validAmount = amount && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency,
    }).format(validAmount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      active: 'default',
      inactive: 'secondary',
      closed: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTransactionTypeBadge = (type: string) => {
    return type === 'credit' ? (
      <Badge className="bg-green-100 text-green-800">
        <TrendingUp className="h-3 w-3 mr-1" />
        Credit
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <TrendingDown className="h-3 w-3 mr-1" />
        Debit
      </Badge>
    );
  };

  const getReconciliationStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      completed: 'default',
      pending: 'secondary',
      in_progress: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  // Generate transaction trend data
  const generateTrendData = () => {
    if (!account?.transactions) return [];
    
    const last7Days = account.transactions.slice(0, 7).reverse();
    return last7Days.map((txn: any) => ({
      date: new Date(txn.transactionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: Math.abs(txn.amount),
    }));
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!account) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Account not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{account.bankName} - {account.accountNumber}</span>
            {getStatusBadge(account.status)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="reconciliations">Reconciliations</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Current Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(account.currentBalance, account.currency)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Credits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(account.statistics?.totalCredits || 0, account.currency)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Debits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(account.statistics?.totalDebits || 0, account.currency)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Unreconciled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {account.statistics?.unreconciledCount || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Account Name</p>
                  <p className="font-medium">{account.accountName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <p className="font-medium capitalize">{account.accountType?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IBAN</p>
                  <p className="font-medium">{account.iban || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SWIFT Code</p>
                  <p className="font-medium">{account.swiftCode || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="font-medium">{account.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">{account.creator?.name || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            {account.transactions && account.transactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Trend (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={generateTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="amount" stroke="#EC8F00" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {account.transactions && account.transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account.transactions.map((txn: any) => (
                        <TableRow key={txn.id}>
                          <TableCell>{formatDate(txn.transactionDate)}</TableCell>
                          <TableCell>{txn.description}</TableCell>
                          <TableCell>{getTransactionTypeBadge(txn.transactionType)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Math.abs(txn.amount), account.currency)}
                          </TableCell>
                          <TableCell>
                            {txn.isReconciled ? (
                              <Badge variant="default">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Reconciled
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reconciliations Tab */}
          <TabsContent value="reconciliations">
            <Card>
              <CardHeader>
                <CardTitle>Reconciliation History</CardTitle>
              </CardHeader>
              <CardContent>
                {account.reconciliations && account.reconciliations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Opening Balance</TableHead>
                        <TableHead className="text-right">Closing Balance</TableHead>
                        <TableHead>Reconciled By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account.reconciliations.map((recon: any) => (
                        <TableRow key={recon.id}>
                          <TableCell>{formatDate(recon.reconciliationDate)}</TableCell>
                          <TableCell>
                            {formatDate(recon.startDate)} - {formatDate(recon.endDate)}
                          </TableCell>
                          <TableCell>{getReconciliationStatusBadge(recon.status)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(recon.openingBalance, account.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(recon.closingBalance, account.currency)}
                          </TableCell>
                          <TableCell>{recon.reconciler?.name || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No reconciliations found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Account Created</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(account.createdAt)} by {account.creator?.name}
                      </p>
                    </div>
                  </div>
                  {account.updatedAt !== account.createdAt && (
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Account Updated</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(account.updatedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
