import { useState, useEffect } from 'react';
import { vendorInvoicesAPI, vendorsAPI, propertiesAPI } from '@/services/api';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface VendorInvoiceFormProps {
  invoice?: any;
  onClose: (refresh?: boolean) => void;
}

export function VendorInvoiceForm({ invoice, onClose }: VendorInvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    vendorId: '',
    propertyId: '',
    invoiceDate: '',
    dueDate: '',
    description: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, amount: 0 },
  ]);
  const [taxRate, setTaxRate] = useState(5); // UAE VAT 5%
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
    fetchProperties();

    if (invoice) {
      setFormData({
        invoiceNumber: invoice.invoiceNumber || '',
        vendorId: invoice.vendorId?.toString() || '',
        propertyId: invoice.propertyId?.toString() || '',
        invoiceDate: invoice.invoiceDate?.split('T')[0] || '',
        dueDate: invoice.dueDate?.split('T')[0] || '',
        description: invoice.description || '',
        notes: invoice.notes || '',
      });

      if (invoice.lineItems && invoice.lineItems.length > 0) {
        setLineItems(invoice.lineItems);
      }
    } else {
      // Auto-generate invoice number
      generateInvoiceNumber();
    }
  }, [invoice]);

  const fetchVendors = async () => {
    try {
      const { data } = await vendorsAPI.getAll({ limit: 100, status: 'active' });
      setVendors(data.data.vendors);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const { data } = await propertiesAPI.getAll({ limit: 100 });
      setProperties(data.data.properties);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setFormData((prev) => ({ ...prev, invoiceNumber: `VI-${year}${month}-${random}` }));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    return (calculateSubtotal() * taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };

    // Recalculate amount
    if (field === 'quantity' || field === 'unitPrice') {
      newLineItems[index].amount = newLineItems[index].quantity * newLineItems[index].unitPrice;
    }

    setLineItems(newLineItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Invoice number is required';
    }

    if (!formData.vendorId) {
      newErrors.vendorId = 'Vendor is required';
    }

    if (!formData.invoiceDate) {
      newErrors.invoiceDate = 'Invoice date is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    if (lineItems.some((item) => !item.description.trim())) {
      newErrors.lineItems = 'All line items must have a description';
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

      const subtotal = calculateSubtotal();
      const taxAmount = calculateTax();
      const totalAmount = calculateTotal();

      const submitData = {
        invoiceNumber: formData.invoiceNumber,
        vendorId: parseInt(formData.vendorId),
        propertyId: formData.propertyId ? parseInt(formData.propertyId) : null,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        description: formData.description,
        notes: formData.notes,
        lineItems,
      };

      if (invoice) {
        await vendorInvoicesAPI.update(invoice.id, submitData);
        toast({
          title: 'Success',
          description: 'Invoice updated successfully',
        });
      } else {
        await vendorInvoicesAPI.create(submitData);
        toast({
          title: 'Success',
          description: 'Invoice created successfully',
        });
      }

      onClose(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save invoice',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-calculate due date based on vendor payment terms
    if (field === 'vendorId' && value) {
      const vendor = vendors.find((v) => v.id === parseInt(value));
      if (vendor && vendor.paymentTerms && formData.invoiceDate) {
        const invoiceDate = new Date(formData.invoiceDate);
        const terms = parseInt(vendor.paymentTerms.replace(/\D/g, '')) || 30;
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + terms);
        setFormData((prev) => ({ ...prev, dueDate: dueDate.toISOString().split('T')[0] }));
      }
    }

    // Auto-calculate due date when invoice date changes
    if (field === 'invoiceDate' && value && formData.vendorId) {
      const vendor = vendors.find((v) => v.id === parseInt(formData.vendorId));
      if (vendor && vendor.paymentTerms) {
        const invoiceDate = new Date(value);
        const terms = parseInt(vendor.paymentTerms.replace(/\D/g, '')) || 30;
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + terms);
        setFormData((prev) => ({ ...prev, dueDate: dueDate.toISOString().split('T')[0] }));
      }
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? 'Edit Vendor Invoice' : 'New Vendor Invoice'}
          </DialogTitle>
          <DialogDescription>
            {invoice
              ? 'Update invoice information below'
              : 'Enter invoice details to create a new vendor invoice'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Basic Information */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">
                  Invoice Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  className={errors.invoiceNumber ? 'border-red-500' : ''}
                />
                {errors.invoiceNumber && (
                  <p className="text-sm text-red-500">{errors.invoiceNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendorId">
                  Vendor <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  value={formData.vendorId}
                  onValueChange={(value) => handleChange('vendorId', value)}
                  placeholder="Select vendor"
                  searchPlaceholder="Search vendors..."
                  emptyMessage="No vendors found"
                  className={errors.vendorId ? 'border-red-500' : ''}
                  options={vendors.map((vendor) => ({
                    value: vendor.id.toString(),
                    label: vendor.vendorName,
                  }))}
                />
                {errors.vendorId && (
                  <p className="text-sm text-red-500">{errors.vendorId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyId">Property (Optional)</Label>
                <SearchableSelect
                  value={formData.propertyId || "none"}
                  onValueChange={(value) => handleChange('propertyId', value === "none" ? '' : value)}
                  placeholder="Select property"
                  searchPlaceholder="Search properties..."
                  emptyMessage="No properties found"
                  options={[
                    { value: 'none', label: 'None' },
                    ...properties.map((property) => ({
                      value: property.id.toString(),
                      label: property.title,
                    })),
                  ]}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">
                  Invoice Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => handleChange('invoiceDate', e.target.value)}
                  className={errors.invoiceDate ? 'border-red-500' : ''}
                />
                {errors.invoiceDate && (
                  <p className="text-sm text-red-500">{errors.invoiceDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">
                  Due Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  className={errors.dueDate ? 'border-red-500' : ''}
                />
                {errors.dueDate && (
                  <p className="text-sm text-red-500">{errors.dueDate}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Calculated from vendor payment terms
                </p>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {errors.lineItems && (
                <p className="text-sm text-red-500">{errors.lineItems}</p>
              )}

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-32">Unit Price</TableHead>
                        <TableHead className="w-32">Amount</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                handleLineItemChange(index, 'description', e.target.value)
                              }
                              placeholder="Item description"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                              disabled={lineItems.length === 1}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Totals */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Subtotal:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(calculateSubtotal())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">VAT ({taxRate}%):</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(calculateTax())}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-base font-semibold">Total:</span>
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description and Notes */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={2}
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
              {invoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

