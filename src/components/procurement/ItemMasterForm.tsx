import { useState, useEffect } from 'react';
import { itemsAPI, chartOfAccountsAPI } from '@/services/api';
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
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Loader2 } from 'lucide-react';

interface ItemMasterFormProps {
  item?: any;
  onClose: (refresh?: boolean) => void;
}

export function ItemMasterForm({ item, onClose }: ItemMasterFormProps) {
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    itemName: '',
    itemCategory: 'material',
    unitOfMeasure: 'pcs',
    accountId: '',
    description: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
    if (item) {
      setFormData({
        itemName: item.itemName || '',
        itemCategory: item.itemCategory || 'material',
        unitOfMeasure: item.unitOfMeasure || 'pcs',
        accountId: item.accountId?.toString() || '',
        description: item.description || '',
        isActive: item.isActive !== undefined ? item.isActive : true,
      });
    }
  }, [item]);

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await chartOfAccountsAPI.getAll({ 
        accountType: 'expense,asset',
        limit: 500 
      });
      const data = response.data?.data?.accounts || response.data?.accounts || [];
      // Filter to only expense and asset accounts
      const filteredAccounts = data.filter((acc: any) => 
        acc.accountType === 'expense' || acc.accountType === 'asset'
      );
      setAccounts(filteredAccounts);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (!formData.accountId) {
      newErrors.accountId = 'Account is required';
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

    try {
      setLoading(true);

      const submitData = {
        itemName: formData.itemName,
        itemCategory: formData.itemCategory,
        unitOfMeasure: formData.unitOfMeasure,
        accountId: parseInt(formData.accountId),
        description: formData.description,
        isActive: formData.isActive,
      };

      if (item) {
        await itemsAPI.update(item.id, submitData);
        toast({
          title: 'Success',
          description: 'Item updated successfully',
        });
      } else {
        await itemsAPI.create(submitData);
        toast({
          title: 'Success',
          description: 'Item created successfully',
        });
      }

      onClose(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save item',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'New Item'}</DialogTitle>
          <DialogDescription>
            {item ? 'Update item details' : 'Create a new item in the master list'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">
                Item Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="itemName"
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
                placeholder="Enter item name"
                className={errors.itemName ? 'border-destructive' : ''}
              />
              {errors.itemName && (
                <p className="text-sm text-destructive">{errors.itemName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemCategory">Category</Label>
              <SearchableSelect
                value={formData.itemCategory}
                onValueChange={(value) =>
                  setFormData({ ...formData, itemCategory: value })
                }
                placeholder="Select category"
                searchPlaceholder="Search categories..."
                emptyMessage="No categories found"
                options={[
                  { value: 'material', label: 'Material' },
                  { value: 'service', label: 'Service' },
                  { value: 'equipment', label: 'Equipment' },
                  { value: 'supplies', label: 'Supplies' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
              <Input
                id="unitOfMeasure"
                value={formData.unitOfMeasure}
                onChange={(e) =>
                  setFormData({ ...formData, unitOfMeasure: e.target.value })
                }
                placeholder="e.g., pcs, kg, m, box"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountId">
                Account <span className="text-destructive">*</span>
              </Label>
              {loadingAccounts ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading accounts...</span>
                </div>
              ) : (
                <SearchableSelect
                  value={formData.accountId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, accountId: value })
                  }
                  placeholder="Select account"
                  searchPlaceholder="Search accounts..."
                  emptyMessage="No accounts found"
                  className={errors.accountId ? 'border-destructive' : ''}
                  options={accounts.map((account) => ({
                    value: account.id.toString(),
                    label: `${account.accountCode} - ${account.accountName} (${account.accountType})`,
                  }))}
                />
              )}
              {errors.accountId && (
                <p className="text-sm text-destructive">{errors.accountId}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Item description"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {item ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
