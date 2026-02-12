import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface AccountFormProps {
  account?: any;
  parentAccountId?: number;
  onClose: (refresh?: boolean) => void;
}

export function AccountForm({ account, parentAccountId, onClose }: AccountFormProps) {
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
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

        <div className="space-y-4 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="accountCode">
                Account Code <span className="text-red-500">*</span>
              </Label>
              <Input id="accountCode" placeholder="1000" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">
                Account Name <span className="text-red-500">*</span>
              </Label>
              <Input id="accountName" placeholder="Cash and Bank" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="accountType">
                Account Type <span className="text-red-500">*</span>
              </Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentAccount">Parent Account</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="None (Top Level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  <SelectItem value="1">1000 - Assets</SelectItem>
                  <SelectItem value="2">2000 - Liabilities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxCategory">Tax Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select tax category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vat_applicable">VAT Applicable</SelectItem>
                  <SelectItem value="vat_exempt">VAT Exempt</SelectItem>
                  <SelectItem value="zero_rated">Zero Rated</SelectItem>
                  <SelectItem value="out_of_scope">Out of Scope</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="AED" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AED">AED</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="isReconcilable" />
            <Label htmlFor="isReconcilable" className="font-normal">
              This account is reconcilable (for bank accounts)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="isActive" defaultChecked />
            <Label htmlFor="isActive" className="font-normal">
              Active
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={() => onClose(true)}>
            {account ? 'Update Account' : 'Create Account'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

