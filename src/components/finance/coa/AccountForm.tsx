import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { chartOfAccountsAPI } from '@/services/api';
import { cacheService } from '@/services/cache';

const accountSchema = z.object({
  accountCode: z.string().min(1, 'Account code is required'),
  accountName: z.string().min(1, 'Account name is required'),
  accountType: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  parentAccountId: z.string().optional().nullable(),
  taxCategory: z.enum(['vat_applicable', 'vat_exempt', 'zero_rated', 'out_of_scope']).default('vat_exempt'),
  currency: z.string().default('AED'),
  isReconcilable: z.boolean().default(false),
  isActive: z.boolean().default(true),
  description: z.string().optional().nullable(),
  openingBalance: z.string().or(z.number()).optional().transform(v => v ? parseFloat(v.toString()) : 0),
});

type AccountFormValues = z.infer<typeof accountSchema>;

interface AccountFormProps {
  account?: any;
  parentAccountId?: number;
  onClose: (refresh?: boolean) => void;
}

export function AccountForm({ account, parentAccountId, onClose }: AccountFormProps) {
  const [loading, setLoading] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<any[]>([]);
  const [fetchingParents, setFetchingParents] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountCode: account?.accountCode || '',
      accountName: account?.accountName || '',
      accountType: account?.accountType || 'asset',
      parentAccountId: account?.parentAccountId?.toString() || parentAccountId?.toString() || null,
      taxCategory: account?.taxCategory || 'vat_exempt',
      currency: account?.currency || 'AED',
      isReconcilable: account?.isReconcilable || false,
      isActive: account?.isActive ?? true,
      description: account?.description || '',
      openingBalance: account?.openingBalance || 0,
    },
  });

  useEffect(() => {
    const fetchParents = async () => {
      setFetchingParents(true);
      try {
        const response = await chartOfAccountsAPI.getAll({ limit: 1000 });
        const accounts = response.data?.data?.accounts || [];
        // Filter out current account and its descendants to avoid circular references if editing
        const filtered = accounts.filter((acc: any) => acc.id !== account?.id);
        setParentAccounts(filtered);
      } catch (error) {
        console.error('Error fetching parent accounts:', error);
      } finally {
        setFetchingParents(false);
      }
    };

    fetchParents();
  }, [account]);

  // Update form when account changes (for edit mode)
  useEffect(() => {
    if (account) {
      form.reset({
        accountCode: account.accountCode || '',
        accountName: account.accountName || '',
        accountType: account.accountType || 'asset',
        parentAccountId: account.parentAccountId?.toString() || null,
        taxCategory: account.taxCategory || 'vat_exempt',
        currency: account.currency || 'AED',
        isReconcilable: account.isReconcilable || false,
        isActive: account.isActive ?? true,
        description: account.description || '',
        openingBalance: account.openingBalance || 0,
      });
    }
  }, [account, form]);

  const onSubmit = async (values: AccountFormValues) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        parentAccountId: values.parentAccountId === 'none' || !values.parentAccountId ? null : parseInt(values.parentAccountId),
      };

      if (account?.id) {
        await chartOfAccountsAPI.update(account.id, payload);
        toast.success('Account updated successfully');
      } else {
        await chartOfAccountsAPI.create(payload);
        toast.success('Account created successfully');
      }
      cacheService.invalidatePattern('/chart-of-accounts');
      onClose(true);
    } catch (error: any) {
      console.error('Error saving account:', error);
      toast.error(error.response?.data?.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? 'Edit Account' : 'Add New Account'}
          </DialogTitle>
          <DialogDescription>
            {account
              ? 'Update account information'
              : parentAccountId
              ? 'Add a child account'
              : 'Create a new account'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="accountCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Cash and Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Account</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || 'none'}
                      disabled={fetchingParents}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={fetchingParents ? "Loading..." : "None (Top Level)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {parentAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id.toString()}>
                            {acc.accountCode} - {acc.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="taxCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tax category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="vat_applicable">VAT Applicable</SelectItem>
                        <SelectItem value="vat_exempt">VAT Exempt</SelectItem>
                        <SelectItem value="zero_rated">Zero Rated</SelectItem>
                        <SelectItem value="out_of_scope">Out of Scope</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="AED" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
               <FormField
                control={form.control}
                name="openingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Account description..." 
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="isReconcilable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Reconcilable
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mark if this account is a bank or cash account that needs reconciliation.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Active
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Account is available for transactions when active.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {account ? 'Update Account' : 'Create Account'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
