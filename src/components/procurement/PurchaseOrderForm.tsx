import { useState, useEffect } from 'react';
import { purchaseOrdersAPI, vendorsAPI, itemsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useDocumentNumberingMode } from '@/hooks/useDocumentNumberingMode';

interface PurchaseOrderFormProps {
  purchaseOrder?: any;
  onClose: (refresh?: boolean) => void;
}

export function PurchaseOrderForm({ purchaseOrder, onClose }: PurchaseOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    poNumber: '',
    vendorId: '',
    poDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    notes: '',
    status: 'sent', // Default to sent as per user request
  });
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [taxRate] = useState(5); // Default UAE VAT rate
  const { toast } = useToast();
  const { isManualNumbering, loading: numberingModeLoading } = useDocumentNumberingMode('Purchase Order');

  useEffect(() => {
    fetchVendors();
    fetchItems();
    if (purchaseOrder) {
      setFormData({
        poNumber: purchaseOrder.poNumber || '',
        vendorId: purchaseOrder.vendorId?.toString() || '',
        poDate: purchaseOrder.poDate ? new Date(purchaseOrder.poDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toISOString().split('T')[0] : '',
        notes: purchaseOrder.notes || '',
        status: purchaseOrder.status || 'draft',
      });
      // Initialize line items with tax fields, defaulting to taxable if not specified
      const itemsWithTax = (purchaseOrder.lineItems || []).map((item: any) => {
        // Migrate old tax_classification values to UAE FTA standards
        let classification = item.tax_classification || '';
        if (classification === 'VAT' || classification === '') {
          classification = item.taxable !== false ? 'Standard-Rated' : 'Exempt';
        }
        
        return {
          ...item,
          taxable: item.taxable !== false, // Default to true
          tax_percent: item.tax_percent || (item.taxable !== false ? taxRate : 0),
          tax_classification: classification,
          tax_amount: item.tax_amount || 0,
        };
      });
      setLineItems(itemsWithTax);
    } else {
      setFormData({
        poNumber: '',
        vendorId: '',
        poDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        notes: '',
        status: 'sent', // Default to sent
      });
      setLineItems([{ item_id: '', quantity: 1, unit_price: 0, total: 0, taxable: true, tax_percent: taxRate, tax_classification: 'Standard-Rated', tax_amount: 0 }]);
    }
  }, [purchaseOrder]);

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll({ limit: 100, status: 'active' }, true);
      setVendors(response.data?.data?.vendors || []);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAll({ limit: 500, isActive: true });
      setItems(response.data?.data?.items || []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { item_id: '', quantity: 1, unit_price: 0, total: 0, taxable: true, tax_percent: taxRate, tax_classification: 'Standard-Rated', tax_amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Handle tax classification changes
    if (field === 'tax_classification') {
      const classification = value;
      if (classification === 'Exempt') {
        updated[index].taxable = false;
        updated[index].tax_percent = 0;
      } else if (classification === 'Zero-Rated') {
        updated[index].taxable = true;
        updated[index].tax_percent = 0;
      } else if (classification === 'Standard-Rated') {
        updated[index].taxable = true;
        updated[index].tax_percent = taxRate;
      }
    }
    
    // Handle taxable checkbox changes
    if (field === 'taxable') {
      if (value === false) {
        updated[index].tax_classification = 'Exempt';
        updated[index].tax_percent = 0;
      } else if (!updated[index].tax_classification || updated[index].tax_classification === 'Exempt') {
        updated[index].tax_classification = 'Standard-Rated';
        updated[index].tax_percent = taxRate;
      }
    }
    
    // Recalculate total and tax when quantity, unit_price, taxable, tax_percent, or tax_classification changes
    if (field === 'quantity' || field === 'unit_price' || field === 'taxable' || field === 'tax_percent' || field === 'tax_classification') {
      const quantity = updated[index].quantity || 0;
      const unitPrice = updated[index].unit_price || 0;
      const subtotal = quantity * unitPrice;
      updated[index].total = subtotal;
      
      // Calculate tax based on classification
      const classification = updated[index].tax_classification;
      if (classification === 'Standard-Rated') {
        updated[index].tax_percent = taxRate;
        updated[index].tax_amount = (subtotal * taxRate) / 100;
      } else if (classification === 'Zero-Rated' || classification === 'Exempt') {
        updated[index].tax_amount = 0;
        if (classification === 'Zero-Rated') {
          updated[index].tax_percent = 0;
        } else {
          updated[index].tax_percent = 0;
        }
      } else {
        // Fallback for old data or custom
        const isTaxable = updated[index].taxable === true;
        const itemTaxPercent = isTaxable ? (updated[index].tax_percent || taxRate) : 0;
        updated[index].tax_amount = (subtotal * itemTaxPercent) / 100;
      }
    }
    
    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    // Sum up tax from each line item
    const taxAmount = lineItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPoNumber = formData.poNumber.trim();
    if (!purchaseOrder && isManualNumbering && !trimmedPoNumber) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a purchase order number before saving',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.vendorId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a vendor',
        variant: 'destructive',
      });
      return;
    }

    if (lineItems.length === 0 || lineItems.some(item => !item.item_id || item.quantity <= 0)) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one valid line item',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { subtotal, taxAmount, totalAmount } = calculateTotals();

      const submitData = {
        ...formData,
        poNumber: isManualNumbering ? trimmedPoNumber : undefined,
        vendorId: parseInt(formData.vendorId),
        lineItems: lineItems.map(item => {
          const classification = item.tax_classification || (item.taxable === true ? 'Standard-Rated' : 'Exempt');
          const isTaxable = classification !== 'Exempt';
          const taxPercent = classification === 'Standard-Rated' ? taxRate : 0;
          
          return {
            item_id: parseInt(item.item_id),
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unit_price),
            total: parseFloat(item.total),
            taxable: isTaxable,
            tax_percent: taxPercent,
            tax_classification: classification,
            tax_amount: parseFloat(item.tax_amount || 0),
          };
        }),
        subtotal,
        taxAmount,
        totalAmount,
      };

      if (purchaseOrder) {
        await purchaseOrdersAPI.update(purchaseOrder.id, submitData);
        toast({ title: 'Success', description: 'Purchase order updated successfully' });
      } else {
        await purchaseOrdersAPI.create(submitData);
        toast({ title: 'Success', description: 'Purchase order created successfully' });
      }

      onClose(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save purchase order',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{purchaseOrder ? 'Edit Purchase Order' : 'New Purchase Order'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <SearchableSelect
                value={formData.vendorId}
                onValueChange={(value) => setFormData({ ...formData, vendorId: value })}
                placeholder="Select vendor"
                searchPlaceholder="Search vendors..."
                emptyMessage="No vendors found"
                options={vendors.map((vendor) => ({
                  value: vendor.id.toString(),
                  label: vendor.vendorName,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>PO Number</Label>
              <Input
                value={purchaseOrder ? (purchaseOrder.poNumber || formData.poNumber) : formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                disabled={!!purchaseOrder || numberingModeLoading || !isManualNumbering}
                placeholder={isManualNumbering ? 'Enter PO number' : 'Auto-generated'}
                className={!isManualNumbering || !!purchaseOrder ? 'bg-muted' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label>PO Date *</Label>
              <Input
                type="date"
                value={formData.poDate}
                onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Delivery Date</Label>
              <Input
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Taxable</TableHead>
                  <TableHead>Tax Type</TableHead>
                  <TableHead>Tax %</TableHead>
                  <TableHead>Tax Amount</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <SearchableSelect
                        value={item.item_id?.toString() || ''}
                        onValueChange={(value) => updateLineItem(index, 'item_id', value)}
                        placeholder="Select item"
                        searchPlaceholder="Search items..."
                        emptyMessage="No items found"
                        options={items.map((it) => ({
                          value: it.id.toString(),
                          label: `${it.itemCode} - ${it.itemName}`,
                        }))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.total?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={item.taxable === true && item.tax_classification !== 'Exempt'}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          if (isChecked) {
                            // If checking, set to Standard-Rated if currently Exempt
                            if (item.tax_classification === 'Exempt' || !item.tax_classification) {
                              updateLineItem(index, 'tax_classification', 'Standard-Rated');
                            }
                            updateLineItem(index, 'taxable', true);
                          } else {
                            // If unchecking, set to Exempt
                            updateLineItem(index, 'tax_classification', 'Exempt');
                            updateLineItem(index, 'taxable', false);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <SearchableSelect
                        value={item.tax_classification || 'Standard-Rated'}
                        onValueChange={(value) => updateLineItem(index, 'tax_classification', value)}
                        placeholder="Tax Type"
                        searchPlaceholder="Search tax types..."
                        emptyMessage="No tax types found"
                        className="w-40"
                        options={[
                          { value: 'Standard-Rated', label: 'Standard-Rated (5%)' },
                          { value: 'Zero-Rated', label: 'Zero-Rated (0%)' },
                          { value: 'Exempt', label: 'Exempt' },
                        ]}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.tax_percent || (item.tax_classification === 'Standard-Rated' ? taxRate : 0)}
                        onChange={(e) => {
                          const newPercent = parseFloat(e.target.value) || 0;
                          updateLineItem(index, 'tax_percent', newPercent);
                          // Update classification based on tax percent
                          if (newPercent === 0 && item.tax_classification === 'Standard-Rated') {
                            updateLineItem(index, 'tax_classification', 'Zero-Rated');
                          } else if (newPercent === taxRate && item.tax_classification !== 'Standard-Rated') {
                            updateLineItem(index, 'tax_classification', 'Standard-Rated');
                          }
                        }}
                        min="0"
                        max="100"
                        step="0.01"
                        disabled={item.tax_classification === 'Exempt' || item.tax_classification === 'Zero-Rated'}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>{item.tax_amount?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="font-bold">
                      {((item.total || 0) + (item.tax_amount || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end space-x-4">
            <div className="text-right space-y-1">
              <div>Subtotal: {subtotal.toFixed(2)} AED</div>
              <div>Total Tax: {taxAmount.toFixed(2)} AED</div>
              <div className="font-bold">Total: {totalAmount.toFixed(2)} AED</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <SearchableSelect
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              placeholder="Select status"
              searchPlaceholder="Search statuses..."
              emptyMessage="No statuses found"
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
              ]}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {purchaseOrder ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
