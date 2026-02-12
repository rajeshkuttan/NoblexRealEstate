import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { chartOfAccountsAPI } from '@/services/api';
import { toast } from 'sonner';

interface Account {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  level: number;
  openingBalance?: number;
  balance?: number;
  parentAccountId?: number;
}

interface BalanceEntry {
  debit: string;
  credit: string;
}

interface OpeningBalancesDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
}

const TYPE_COLORS: Record<string, string> = {
  asset: 'bg-green-100 text-green-800',
  liability: 'bg-red-100 text-red-800',
  equity: 'bg-blue-100 text-blue-800',
  revenue: 'bg-purple-100 text-purple-800',
  expense: 'bg-orange-100 text-orange-800',
};

// Assets and Expenses have natural debit balances; Liabilities, Equity, Revenue have natural credit balances
function isDebitNature(type: string): boolean {
  return type === 'asset' || type === 'expense';
}

export function OpeningBalancesDialog({ open, onClose }: OpeningBalancesDialogProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [balances, setBalances] = useState<Record<number, BalanceEntry>>({});

  // Fetch all accounts when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    chartOfAccountsAPI
      .getAll({ limit: 5000 })
      .then((response) => {
        const data = response.data?.data?.accounts || [];
        const sorted = Array.isArray(data)
          ? data.sort((a: Account, b: Account) => a.accountCode.localeCompare(b.accountCode))
          : [];
        setAccounts(sorted);

        // Initialize balances from existing openingBalance values
        const initial: Record<number, BalanceEntry> = {};
        for (const acc of sorted) {
          const ob = parseFloat(String(acc.openingBalance || 0));
          if (ob !== 0) {
            if (isDebitNature(acc.accountType)) {
              initial[acc.id] = { debit: ob > 0 ? ob.toString() : '', credit: ob < 0 ? Math.abs(ob).toString() : '' };
            } else {
              initial[acc.id] = { debit: ob < 0 ? Math.abs(ob).toString() : '', credit: ob > 0 ? ob.toString() : '' };
            }
          }
        }
        setBalances(initial);
      })
      .catch((err) => {
        console.error('Error fetching accounts:', err);
        toast.error('Failed to load accounts');
      })
      .finally(() => setLoading(false));
  }, [open]);

  // Filtered accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (acc) =>
        acc.accountCode.toLowerCase().includes(q) ||
        acc.accountName.toLowerCase().includes(q) ||
        acc.accountType.toLowerCase().includes(q),
    );
  }, [accounts, search]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const entry of Object.values(balances)) {
      totalDebit += parseFloat(entry.debit) || 0;
      totalCredit += parseFloat(entry.credit) || 0;
    }
    return {
      debit: totalDebit,
      credit: totalCredit,
      difference: Math.abs(totalDebit - totalCredit),
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }, [balances]);

  const handleDebitChange = (accountId: number, value: string) => {
    setBalances((prev) => ({
      ...prev,
      [accountId]: {
        debit: value,
        credit: value && parseFloat(value) > 0 ? '' : prev[accountId]?.credit || '',
      },
    }));
  };

  const handleCreditChange = (accountId: number, value: string) => {
    setBalances((prev) => ({
      ...prev,
      [accountId]: {
        debit: value && parseFloat(value) > 0 ? '' : prev[accountId]?.debit || '',
        credit: value,
      },
    }));
  };

  const handleSave = async () => {
    // Build entries array: convert debit/credit to a signed opening balance
    const entries: { id: number; openingBalance: number }[] = [];

    for (const acc of accounts) {
      const entry = balances[acc.id];
      if (!entry) continue;

      const debit = parseFloat(entry.debit) || 0;
      const credit = parseFloat(entry.credit) || 0;
      if (debit === 0 && credit === 0) continue;

      // For debit-nature accounts (asset/expense): positive = debit, negative = credit
      // For credit-nature accounts (liability/equity/revenue): positive = credit, negative = debit
      let openingBalance: number;
      if (isDebitNature(acc.accountType)) {
        openingBalance = debit - credit;
      } else {
        openingBalance = credit - debit;
      }

      entries.push({ id: acc.id, openingBalance });
    }

    if (entries.length === 0) {
      toast.warning('No opening balances to save');
      return;
    }

    setSaving(true);
    try {
      const response = await chartOfAccountsAPI.updateOpeningBalances({ entries });
      const updated = response.data?.data?.updated || 0;
      toast.success(`Opening balances saved for ${updated} account(s)`);
      onClose(true);
    } catch (error: any) {
      console.error('Error saving opening balances:', error);
      toast.error(error.response?.data?.message || 'Failed to save opening balances');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">Opening Balances</DialogTitle>
          <DialogDescription>
            Enter opening balances for each account. Assets and Expenses are debit-nature; Liabilities, Equity, and Revenue are credit-nature.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading accounts...</span>
          </div>
        ) : (
          <div className="flex-1 min-h-0 border rounded-md overflow-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="text-left p-3 font-semibold w-[120px]">Code</th>
                  <th className="text-left p-3 font-semibold">Account Name</th>
                  <th className="text-left p-3 font-semibold w-[100px]">Type</th>
                  <th className="text-right p-3 font-semibold w-[160px]">Debit (AED)</th>
                  <th className="text-right p-3 font-semibold w-[160px]">Credit (AED)</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      {search ? 'No accounts match your search' : 'No accounts found'}
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((account) => {
                    const entry = balances[account.id] || { debit: '', credit: '' };
                    const indent = Math.max(0, (account.level || 1) - 1) * 16;
                    return (
                      <tr
                        key={account.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 font-mono text-xs">{account.accountCode}</td>
                        <td className="p-3" style={{ paddingLeft: `${12 + indent}px` }}>
                          {account.accountName}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="secondary"
                            className={`text-xs capitalize ${TYPE_COLORS[account.accountType] || ''}`}
                          >
                            {account.accountType}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={isDebitNature(account.accountType) ? '0.00' : '—'}
                            value={entry.debit}
                            onChange={(e) => handleDebitChange(account.id, e.target.value)}
                            className="text-right h-8 text-sm"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={!isDebitNature(account.accountType) ? '0.00' : '—'}
                            value={entry.credit}
                            onChange={(e) => handleCreditChange(account.id, e.target.value)}
                            className="text-right h-8 text-sm"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Footer */}
        {!loading && (
          <div className="border rounded-md p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {totals.isBalanced ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Balanced</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700">
                      Difference: AED {formatCurrency(totals.difference)}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-8 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Debits:</span>{' '}
                  <span className="font-semibold">AED {formatCurrency(totals.debit)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Credits:</span>{' '}
                  <span className="font-semibold">AED {formatCurrency(totals.credit)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Opening Balances
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
