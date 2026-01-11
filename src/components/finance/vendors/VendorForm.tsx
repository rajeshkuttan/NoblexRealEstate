import { useState, useEffect } from 'react';
import { vendorsAPI } from '@/services/api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';

interface VendorFormProps {
  vendor?: any;
  onClose: (refresh?: boolean) => void;
}

export function VendorForm({ vendor, onClose }: VendorFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendorName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    trn: '',
    paymentTerms: 'Net 30',
    bankName: '',
    accountNumber: '',
    iban: '',
    swiftCode: '',
    status: 'active',
    notes: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (vendor) {
      setFormData({
        vendorName: vendor.vendorName || '',
        contactPerson: vendor.contactPerson || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || '',
        trn: vendor.trn || '',
        paymentTerms: vendor.paymentTerms || 'Net 30',
        bankName: vendor.bankDetails?.bankName || '',
        accountNumber: vendor.bankDetails?.accountNumber || '',
        iban: vendor.bankDetails?.iban || '',
        swiftCode: vendor.bankDetails?.swiftCode || '',
        status: vendor.status || 'active',
        notes: vendor.notes || '',
      });
    }
  }, [vendor]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.vendorName.trim()) {
      newErrors.vendorName = 'Vendor name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.trn && !/^\d{15}$/.test(formData.trn.replace(/-/g, ''))) {
      newErrors.trn = 'TRN must be 15 digits';
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
        vendorName: formData.vendorName,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        trn: formData.trn,
        paymentTerms: formData.paymentTerms,
        bankDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          iban: formData.iban,
          swiftCode: formData.swiftCode,
        },
        status: formData.status,
        notes: formData.notes,
      };

      if (vendor) {
        await vendorsAPI.update(vendor.id, submitData);
        toast({
          title: 'Success',
          description: 'Vendor updated successfully',
        });
      } else {
        await vendorsAPI.create(submitData);
        toast({
          title: 'Success',
          description: 'Vendor created successfully',
        });
      }

      onClose(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save vendor',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vendor ? 'Edit Vendor' : 'Add New Vendor'}
          </DialogTitle>
          <DialogDescription>
            {vendor
              ? 'Update vendor information below'
              : 'Enter vendor details to add a new supplier'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vendorName">
                    Vendor Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vendorName"
                    value={formData.vendorName}
                    onChange={(e) => handleChange('vendorName', e.target.value)}
                    className={errors.vendorName ? 'border-red-500' : ''}
                  />
                  {errors.vendorName && (
                    <p className="text-sm text-red-500">{errors.vendorName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+971 50 123 4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trn">TRN (Tax Registration Number)</Label>
                  <Input
                    id="trn"
                    value={formData.trn}
                    onChange={(e) => handleChange('trn', e.target.value)}
                    placeholder="123456789012345"
                    maxLength={15}
                    className={errors.trn ? 'border-red-500' : ''}
                  />
                  {errors.trn && (
                    <p className="text-sm text-red-500">{errors.trn}</p>
                  )}
                  <p className="text-xs text-muted-foreground">15 digits</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select
                    value={formData.paymentTerms}
                    onValueChange={(value) => handleChange('paymentTerms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 45">Net 45</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                      <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Bank Details</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleChange('accountNumber', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) => handleChange('iban', e.target.value)}
                    placeholder="AE07 0331 2345 6789 0123 456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="swiftCode">SWIFT Code</Label>
                  <Input
                    id="swiftCode"
                    value={formData.swiftCode}
                    onChange={(e) => handleChange('swiftCode', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="status-active" />
                  <Label htmlFor="status-active" className="font-normal">
                    Active
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="status-inactive" />
                  <Label htmlFor="status-inactive" className="font-normal">
                    Inactive
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="blocked" id="status-blocked" />
                  <Label htmlFor="status-blocked" className="font-normal">
                    Blocked
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
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
              {vendor ? 'Update Vendor' : 'Create Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

