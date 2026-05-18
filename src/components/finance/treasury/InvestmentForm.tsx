import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { investmentsAPI, bankAccountsAPI } from '@/services/api';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';

const investmentSchema = z.object({
  bankAccountId: z.string().min(1, 'Bank account is required'),
  investmentType: z.string().min(1, 'Investment type is required'),
  principalAmount: z.string().min(1, 'Principal amount is required'),
  currency: z.string().default('AED'),
  interestRate: z.string().min(1, 'Interest rate is required'),
  term: z.string().min(1, 'Term is required'),
  startDate: z.string().min(1, 'Start date is required'),
  autoRollover: z.boolean().default(false),
  notes: z.string().optional(),
});

interface InvestmentFormProps {
  investment?: any;
  onSuccess: () => void;
}

export default function InvestmentForm({ investment, onSuccess }: InvestmentFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      bankAccountId: investment?.bankAccountId?.toString() || '',
      investmentType: investment?.investmentType || '',
      principalAmount: investment?.principalAmount?.toString() || '',
      currency: investment?.currency || 'AED',
      interestRate: investment?.interestRate?.toString() || '',
      term: investment?.term?.toString() || '',
      startDate: investment?.startDate ? new Date(investment.startDate).toISOString().split('T')[0] : '',
      autoRollover: investment?.autoRollover || false,
      notes: investment?.notes || '',
    },
  });

  const selectedBankAccountId = watch('bankAccountId');
  const selectedInvestmentType = watch('investmentType');
  const selectedCurrency = watch('currency');
  const bankAccountOptions = bankAccounts.map((account) => ({
    value: account.id.toString(),
    label: `${account.bankName} - ${account.accountName}`,
  }));
  const investmentTypeOptions = [
    { value: 'term_deposit', label: 'Term Deposit' },
    { value: 'fixed_deposit', label: 'Fixed Deposit' },
    { value: 'savings', label: 'Savings' },
    { value: 'treasury_bill', label: 'Treasury Bill' },
    { value: 'bond', label: 'Bond' },
  ];
  const currencyOptions = [
    { value: 'AED', label: 'AED' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'GBP', label: 'GBP' },
  ];

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const response = await bankAccountsAPI.getAll();
      setBankAccounts(response.data.data.bankAccounts || []);
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);

    const payload = {
      bankAccountId: parseInt(data.bankAccountId),
      investmentType: data.investmentType,
      principalAmount: parseFloat(data.principalAmount),
      currency: data.currency,
      interestRate: parseFloat(data.interestRate),
      term: parseInt(data.term),
      startDate: data.startDate,
      autoRollover: data.autoRollover,
      notes: data.notes,
    };

    try {
      if (investment) {
        await investmentsAPI.update(investment.id, payload);
        toast({
          title: 'Success',
          description: 'Investment updated successfully',
        });
      } else {
        await investmentsAPI.create(payload);
        toast({
          title: 'Success',
          description: 'Investment created successfully',
        });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save investment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{investment ? 'Edit Investment' : 'New Investment'}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
        {/* Bank Account */}
        <div className="space-y-2">
          <Label htmlFor="bankAccountId">Bank Account *</Label>
          <SearchableSelect
            value={selectedBankAccountId}
            onValueChange={(value) => setValue('bankAccountId', value)}
            options={bankAccountOptions}
            placeholder="Select bank account"
            searchPlaceholder="Search bank account..."
          />
          {errors.bankAccountId && (
            <p className="text-sm text-red-600">{errors.bankAccountId.message}</p>
          )}
        </div>

        {/* Investment Type */}
        <div className="space-y-2">
          <Label htmlFor="investmentType">Investment Type *</Label>
          <SearchableSelect
            value={selectedInvestmentType}
            onValueChange={(value) => setValue('investmentType', value)}
            options={investmentTypeOptions}
            placeholder="Select investment type"
            searchPlaceholder="Search investment type..."
          />
          {errors.investmentType && (
            <p className="text-sm text-red-600">{errors.investmentType.message}</p>
          )}
        </div>

        {/* Principal Amount & Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="principalAmount">Principal Amount *</Label>
            <Input
              id="principalAmount"
              type="number"
              step="0.01"
              placeholder="100000.00"
              {...register('principalAmount')}
            />
            {errors.principalAmount && (
              <p className="text-sm text-red-600">{errors.principalAmount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <SearchableSelect
              value={selectedCurrency}
              onValueChange={(value) => setValue('currency', value)}
              options={currencyOptions}
              placeholder="Select currency"
              searchPlaceholder="Search currency..."
            />
          </div>
        </div>

        {/* Interest Rate & Term */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="interestRate">Interest Rate (%) *</Label>
            <Input
              id="interestRate"
              type="number"
              step="0.01"
              placeholder="3.50"
              {...register('interestRate')}
            />
            {errors.interestRate && (
              <p className="text-sm text-red-600">{errors.interestRate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="term">Term (Months) *</Label>
            <Input
              id="term"
              type="number"
              placeholder="12"
              {...register('term')}
            />
            {errors.term && (
              <p className="text-sm text-red-600">{errors.term.message}</p>
            )}
          </div>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input type="date" id="startDate" {...register('startDate')} />
          {errors.startDate && (
            <p className="text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>

        {/* Auto Rollover */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoRollover"
            {...register('autoRollover')}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="autoRollover" className="font-normal">
            Auto-rollover on maturity
          </Label>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Additional notes..."
            rows={3}
            {...register('notes')}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : investment ? 'Update Investment' : 'Create Investment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
