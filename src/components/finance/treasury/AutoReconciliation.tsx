import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Play, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { autoReconciliationAPI, bankAccountsAPI } from '@/services/api';
import { Progress } from '@/components/ui/progress';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface BankAccount {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

interface ReconciliationResult {
  matched: number;
  unmatched: number;
  total: number;
}

export default function AutoReconciliation() {
  const { toast } = useToast();
  const [isReconciling, setIsReconciling] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      bankAccountId: '',
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedBankAccountId = watch('bankAccountId');

  const fetchBankAccounts = async () => {
    try {
      const response = await bankAccountsAPI.getAll();
      setBankAccounts(response.data.data.bankAccounts || []);
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  };

  // Fetch bank accounts on mount
  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const onSubmit = async (data: any) => {
    if (!data.bankAccountId) {
      toast({
        title: 'Missing Information',
        description: 'Please select a bank account',
        variant: 'destructive',
      });
      return;
    }

    setIsReconciling(true);
    setResult(null);

    try {
      const response = await autoReconciliationAPI.autoReconcile({
        bankAccountId: parseInt(data.bankAccountId),
        startDate: data.startDate,
        endDate: data.endDate,
      });

      const resultData = response.data.data;
      setResult(resultData);

      toast({
        title: 'Reconciliation Complete',
        description: `Matched ${resultData.matched} of ${resultData.total} transactions`,
      });
    } catch (error: any) {
      toast({
        title: 'Reconciliation Failed',
        description: error.response?.data?.message || 'Failed to reconcile transactions',
        variant: 'destructive',
      });
    } finally {
      setIsReconciling(false);
    }
  };

  const matchRate = result ? (result.matched / result.total) * 100 : 0;
  const bankAccountOptions = bankAccounts.map((account) => ({
    value: account.id.toString(),
    label: `${account.bankName} - ${account.accountName} (${account.accountNumber})`,
  }));

  return (
    <div className="space-y-6">
      {/* Reconciliation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Reconciliation</CardTitle>
          <CardDescription>
            Automatically match bank transactions with payments using intelligent algorithms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Bank Account Selection */}
            <div className="space-y-2">
              <Label htmlFor="bankAccountId">Bank Account</Label>
              <SearchableSelect
                value={selectedBankAccountId}
                onValueChange={(value) => setValue('bankAccountId', value)}
                options={bankAccountOptions}
                placeholder="Select bank account"
                searchPlaceholder="Search bank account..."
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input type="date" id="startDate" {...register('startDate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input type="date" id="endDate" {...register('endDate')} />
              </div>
            </div>

            {/* Run Button */}
            <Button type="submit" disabled={isReconciling || !selectedBankAccountId}>
              <Play className="mr-2 h-4 w-4" />
              {isReconciling ? 'Reconciling...' : 'Run Auto-Reconciliation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Results</CardTitle>
            <CardDescription>Summary of auto-reconciliation process</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Match Rate</span>
                  <span className="font-medium">{matchRate.toFixed(1)}%</span>
                </div>
                <Progress value={matchRate} className="h-3" />
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Total Transactions */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-gray-600" />
                    <span className="text-sm text-gray-600">Total Transactions</span>
                  </div>
                  <p className="text-2xl font-bold">{result.total}</p>
                </div>

                {/* Matched */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-600">Matched</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{result.matched}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {result.total > 0 ? ((result.matched / result.total) * 100).toFixed(1) : 0}%
                  </p>
                </div>

                {/* Unmatched */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-yellow-600">Unmatched</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{result.unmatched}</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {result.total > 0 ? ((result.unmatched / result.total) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Matching Algorithm</h4>
                    <p className="text-sm text-blue-700">
                      Transactions are matched using amount (±0.01 tolerance), date (±3 days), and
                      reference number patterns. Unmatched transactions require manual reconciliation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Auto-Reconciliation Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h4 className="font-medium mb-1">Amount Matching</h4>
                <p className="text-sm text-gray-600">
                  Finds payments with amounts within ±0.01 of the transaction amount
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h4 className="font-medium mb-1">Date Range Matching</h4>
                <p className="text-sm text-gray-600">
                  Checks for payments within ±3 days of the transaction date
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h4 className="font-medium mb-1">Reference Number Matching</h4>
                <p className="text-sm text-gray-600">
                  Matches transaction references with payment numbers and invoice references
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-semibold">
                ✓
              </div>
              <div>
                <h4 className="font-medium mb-1">Automatic Reconciliation</h4>
                <p className="text-sm text-gray-600">
                  Successfully matched transactions are automatically marked as reconciled
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
