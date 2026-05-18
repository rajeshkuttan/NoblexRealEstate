import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Loader2 } from 'lucide-react';
import { chartOfAccountsAPI, bankAccountsAPI } from '@/services/api';

interface BankAccountFormProps {
  account?: any;
  onClose: (refresh?: boolean) => void;
}

export function BankAccountForm({ account, onClose }: BankAccountFormProps) {
  const currencyOptions = [
    { value: 'AED', label: 'AED - UAE Dirham' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'SAR', label: 'SAR - Saudi Riyal' },
  ];

  const accountTypeOptions = [
    { value: 'current', label: 'Current Account' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'fixed_deposit', label: 'Fixed Deposit' },
    { value: 'checking', label: 'Checking Account' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'closed', label: 'Closed' },
  ];

  const [loading, setLoading] = useState(false);
  const [chartAccounts, setChartAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    iban: '',
    swiftCode: '',
    currency: 'AED',
    currentBalance: '0',
    accountType: 'current',
    status: 'active',
    chartAccountId: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchChartAccounts();
    if (account) {
      setFormData({
        bankName: account.bankName || '',
        accountName: account.accountName || '',
        accountNumber: account.accountNumber || '',
        iban: account.iban || '',
        swiftCode: account.swiftCode || '',
        currency: account.currency || 'AED',
        currentBalance: account.currentBalance?.toString() || '0',
        accountType: account.accountType || 'current',
        status: account.status || 'active',
        chartAccountId: account.chartAccountId?.toString() || '',
      });
    }
  }, [account]);

  const fetchChartAccounts = async () => {
    try {
      const response = await chartOfAccountsAPI.getAll({ accountType: 'asset', limit: 100 });
      if (response.data.success) {
        setChartAccounts(response.data.data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch chart accounts:', error);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!formData.accountName.trim()) {
      newErrors.accountName = 'Account name is required';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    }

    if (formData.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(formData.iban.replace(/\s/g, ''))) {
      newErrors.iban = 'Invalid IBAN format';
    }

    if (formData.swiftCode && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(formData.swiftCode)) {
      newErrors.swiftCode = 'Invalid SWIFT code format';
    }

    const balance = parseFloat(formData.currentBalance);
    if (isNaN(balance)) {
      newErrors.currentBalance = 'Invalid balance amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        currentBalance: parseFloat(formData.currentBalance),
        chartAccountId: formData.chartAccountId ? parseInt(formData.chartAccountId) : null,
      };

      const response = account
        ? await bankAccountsAPI.update(account.id, payload)
        : await bankAccountsAPI.create(payload);

      if (response.data.success) {
        toast({
          title: 'Success',
          description: account
            ? 'Bank account updated successfully'
            : 'Bank account created successfully',
        });
        onClose(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description:
          error.response?.data?.message ||
          `Failed to ${account ? 'update' : 'create'} bank account`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const chartAccountOptions = [
    { value: 'none', label: 'None' },
    ...chartAccounts.map((acc) => ({
      value: acc.id.toString(),
      label: `${acc.accountCode} - ${acc.accountName}`,
    })),
  ];

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? 'Edit Bank Account' : 'Add Bank Account'}
          </DialogTitle>
          <DialogDescription>
            {account
              ? 'Update bank account information'
              : 'Add a new bank account to the system'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Bank Name */}
            <div className="space-y-2">
              <Label htmlFor="bankName">
                Bank Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                placeholder="e.g., Emirates NBD"
              />
              {errors.bankName && (
                <p className="text-sm text-red-500">{errors.bankName}</p>
              )}
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <Label htmlFor="accountName">
                Account Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountName"
                value={formData.accountName}
                onChange={(e) => handleChange('accountName', e.target.value)}
                placeholder="e.g., Emirates Lease Flow LLC"
              />
              {errors.accountName && (
                <p className="text-sm text-red-500">{errors.accountName}</p>
              )}
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="accountNumber">
                Account Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(e) => handleChange('accountNumber', e.target.value)}
                placeholder="e.g., 1234567890"
              />
              {errors.accountNumber && (
                <p className="text-sm text-red-500">{errors.accountNumber}</p>
              )}
            </div>

            {/* IBAN */}
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => handleChange('iban', e.target.value.toUpperCase())}
                placeholder="e.g., AE070331234567890123456"
              />
              {errors.iban && (
                <p className="text-sm text-red-500">{errors.iban}</p>
              )}
            </div>

            {/* SWIFT Code */}
            <div className="space-y-2">
              <Label htmlFor="swiftCode">SWIFT Code</Label>
              <Input
                id="swiftCode"
                value={formData.swiftCode}
                onChange={(e) => handleChange('swiftCode', e.target.value.toUpperCase())}
                placeholder="e.g., EBILAEAD"
              />
              {errors.swiftCode && (
                <p className="text-sm text-red-500">{errors.swiftCode}</p>
              )}
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <SearchableSelect
                value={formData.currency}
                onValueChange={(value) => handleChange('currency', value)}
                options={currencyOptions}
                placeholder="Select currency"
                searchPlaceholder="Search currency..."
              />
            </div>

            {/* Opening Balance */}
            <div className="space-y-2">
              <Label htmlFor="currentBalance">
                {account ? 'Current Balance' : 'Opening Balance'}
              </Label>
              <Input
                id="currentBalance"
                type="number"
                step="0.01"
                value={formData.currentBalance}
                onChange={(e) => handleChange('currentBalance', e.target.value)}
                placeholder="0.00"
              />
              {errors.currentBalance && (
                <p className="text-sm text-red-500">{errors.currentBalance}</p>
              )}
            </div>

            {/* Account Type */}
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type</Label>
              <SearchableSelect
                value={formData.accountType}
                onValueChange={(value) => handleChange('accountType', value)}
                options={accountTypeOptions}
                placeholder="Select account type"
                searchPlaceholder="Search account type..."
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <SearchableSelect
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
                options={statusOptions}
                placeholder="Select status"
                searchPlaceholder="Search status..."
              />
            </div>

            {/* Chart Account Link */}
            <div className="space-y-2">
              <Label htmlFor="chartAccountId">Link to Chart of Accounts</Label>
              <SearchableSelect
                value={formData.chartAccountId || 'none'}
                onValueChange={(value) => handleChange('chartAccountId', value === 'none' ? '' : value)}
                options={chartAccountOptions}
                placeholder="Select account..."
                searchPlaceholder="Search chart account..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {account ? 'Update Account' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
