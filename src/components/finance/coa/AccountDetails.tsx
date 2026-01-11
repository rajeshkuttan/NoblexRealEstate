import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AccountDetailsProps {
  accountId: number;
  onClose: () => void;
}

export function AccountDetails({ accountId, onClose }: AccountDetailsProps) {
  // Mock data
  const account = {
    id: accountId,
    accountCode: '1110',
    accountName: 'Cash and Bank',
    accountType: 'asset',
    balance: 150000,
    isReconcilable: true,
    taxCategory: 'vat_exempt',
    currency: 'AED',
    status: 'active',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

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
                    <Badge className="mt-1">
                      {account.accountType.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Current Balance</p>
                    <p className="text-lg font-bold mt-1">
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Currency</p>
                    <p className="text-sm text-muted-foreground">
                      {account.currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tax Category</p>
                    <Badge variant="outline" className="mt-1">
                      {account.taxCategory.replace(/_/g, ' ').toUpperCase()}
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
                    <Badge variant="default" className="mt-1 bg-green-500">
                      {account.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Transaction history will be displayed here
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

