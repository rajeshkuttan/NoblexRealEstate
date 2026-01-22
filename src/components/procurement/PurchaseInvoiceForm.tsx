import { useState, useEffect } from 'react';
import { purchaseInvoicesAPI, vendorsAPI, purchaseOrdersAPI, goodsReceiptsAPI, itemsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface PurchaseInvoiceFormProps {
  purchaseInvoice?: any;
  onClose: (refresh?: boolean) => void;
}

export function PurchaseInvoiceForm({ purchaseInvoice, onClose }: PurchaseInvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    vendorId: '',
    purchaseOrderId: '',
    goodsReceiptId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [taxRate] = useState(5);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
    fetchItems();
    if (purchaseInvoice) {
      setFormData({
        vendorId: purchaseInvoice.vendorId?.toString() || '',
        purchaseOrderId: purchaseInvoice.purchaseOrderId?.toString() || '',
        goodsReceiptId: purchaseInvoice.goodsReceiptId?.toString() || '',
        invoiceDate: purchaseInvoice.invoiceDate ? new Date(purchaseInvoice.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: purchaseInvoice.dueDate ? new Date(purchaseInvoice.dueDate).toISOString().split('T')[0] : '',
        notes: purchaseInvoice.notes || '',
      });
      setLineItems(purchaseInvoice.lineItems || []);
    } else {
      setLineItems([{ item_id: '', quantity: 1, unit_price: 0, total: 0 }]);
    }
  }, [purchaseInvoice]);

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll({ limit: 100, status: 'active' });
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

  const handlePOSelect = async (poId: string) => {
    if (!poId) return;
    try {
      const response = await purchaseOrdersAPI.getById(parseInt(poId));
      const po = response.data?.data?.purchaseOrder;
      if (po?.lineItems) {
        const items = po.lineItems.map((item: any) => ({
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          account_id: item.account_id,
        }));
        setLineItems(items);
      }
    } catch (error) {
      console.error('Failed to fetch PO details:', error);
    }
  };

  const handleGRSelect = async (grId: string) => {
    if (!grId) return;
    try {
      const response = await goodsReceiptsAPI.getById(parseInt(grId));
      const gr = response.data?.data?.goodsReceipt;
      if (gr?.lineItems) {
        const items = gr.lineItems.map((item: any) => ({
          item_id: item.item_id,
          quantity: item.received_qty,
          unit_price: item.unit_price,
          total: (item.received_qty || 0) * (item.unit_price || 0),
        }));
        setLineItems(items);
      }
    } catch (error) {
      console.error('Failed to fetch GR details:', error);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { item_id: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = async (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'item_id' && value) {
      // Fetch item to get account_id
      const item = items.find(i => i.id.toString() === value);
      if (item) {
        updated[index].account_id = item.accountId;
      }
    }
    
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = (updated[index].quantity || 0) * (updated[index].unit_price || 0);
    }
    
    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        vendorId: parseInt(formData.vendorId),
        purchaseOrderId: formData.purchaseOrderId ? parseInt(formData.purchaseOrderId) : undefined,
        goodsReceiptId: formData.goodsReceiptId ? parseInt(formData.goodsReceiptId) : undefined,
        lineItems: lineItems.map(item => ({
          item_id: parseInt(item.item_id),
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          total: parseFloat(item.total),
          account_id: item.account_id,
        })),
        subtotal,
        taxAmount,
        totalAmount,
      };

      if (purchaseInvoice) {
        await purchaseInvoicesAPI.update(purchaseInvoice.id, submitData);
        toast({ title: 'Success', description: 'Purchase invoice updated successfully' });
      } else {
        await purchaseInvoicesAPI.create(submitData);
        toast({ title: 'Success', description: 'Purchase invoice created successfully' });
      }

      onClose(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save purchase invoice',
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
          <DialogTitle>{purchaseInvoice ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select value={formData.vendorId} onValueChange={(value) => setFormData({ ...formData, vendorId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.vendorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Order (Optional)</Label>
              <Select
                value={formData.purchaseOrderId}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setFormData({ ...formData, purchaseOrderId: '' });
                  } else {
                    setFormData({ ...formData, purchaseOrderId: value });
                    handlePOSelect(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {/* PO options would be loaded here */}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={item.item_id?.toString() || ''}
                        onValueChange={(value) => updateLineItem(index, 'item_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((it) => (
                            <SelectItem key={it.id} value={it.id.toString()}>
                              {it.itemCode} - {it.itemName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>{item.total?.toFixed(2) || '0.00'}</TableCell>
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
              <div>Tax ({taxRate}%): {taxAmount.toFixed(2)} AED</div>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {purchaseInvoice ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
