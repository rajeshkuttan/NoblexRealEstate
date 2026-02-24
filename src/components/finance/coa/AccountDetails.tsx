import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { chartOfAccountsAPI } from '@/services/api';

interface AccountDetailsProps {
  accountId: number;
  onClose: () => void;
}

export function AccountDetails({ accountId, onClose }: AccountDetailsProps) {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccount = async () => {
      setLoading(true);
      try {
        const response = await chartOfAccountsAPI.getById(accountId);
        setAccount(response.data?.data || response.data);
      } catch (error) {
        console.error('Error fetching account details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [accountId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
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

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading account details...</span>
        </DialogContent>
      </Dialog>
    );
  }

  if (!account) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl py-24 text-center text-muted-foreground">
          Account not found
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account.accountCode} - {account.accountName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="balance">Balance History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium">Account Code</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {account.accountCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Account Name</p>
                    <p className="text-sm text-muted-foreground">
                      {account.accountName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Account Type</p>
                    <Badge className={`mt-1 ${getAccountTypeColor(account.accountType)} text-white border-none`}>
                      {account.accountType.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Current Balance</p>
                    <p className="text-lg font-bold mt-1">
                      {formatCurrency(parseFloat(account.balance || 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Currency</p>
                    <p className="text-sm text-muted-foreground">
                      {account.currency || 'AED'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tax Category</p>
                    <Badge variant="outline" className="mt-1">
                      {(account.taxCategory || 'VAT_EXEMPT').replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Reconcilable</p>
                    <Badge variant={account.isReconcilable ? 'default' : 'secondary'} className="mt-1">
                      {account.isReconcilable ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant="default" className={`mt-1 ${account.isActive ? 'bg-green-500' : 'bg-red-500'}`}>
                      {account.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                  {account.parentAccount && (
                    <div className="md:col-span-2 border-t pt-4">
                      <p className="text-sm font-medium">Parent Account</p>
                      <p className="text-sm text-muted-foreground">
                        {account.parentAccount.accountCode} - {account.parentAccount.accountName} ({account.parentAccount.accountType.toUpperCase()})
                      </p>
                    </div>
                  )}
                  {account.description && (
                    <div className="md:col-span-2 border-t pt-4">
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {account.description}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {account.transactions?.length > 0 ? (
                  <div className="text-left">
                     {/* Transaction list could go here if implemented in backend */}
                     <p>Recent transactions found: {account.transactions.length}</p>
                     <ul className="mt-2 space-y-2 text-sm">
                       {account.transactions.map((t: any) => (
                         <li key={t.id} className="border-b pb-2 flex justify-between">
                            <span>{new Date(t.created_at).toLocaleDateString()} - {t.description || 'No description'}</span>
                            <span className="font-mono font-bold">{formatCurrency(parseFloat(t.amount))}</span>
                         </li>
                       ))}
                     </ul>
                  </div>
                ) : (
                  "No transaction history found for this account"
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balance">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Balance history chart will be displayed here
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
