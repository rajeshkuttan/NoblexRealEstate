import { useState, useEffect } from 'react';
import { purchaseInvoicesAPI, vendorsAPI, purchaseOrdersAPI, goodsReceiptsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';

interface PurchaseInvoiceFormProps {
  purchaseInvoice?: any;
  onClose: (refresh?: boolean) => void;
}

export function PurchaseInvoiceForm({ purchaseInvoice, onClose }: PurchaseInvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    vendorId: '',
    purchaseOrderId: '',
    goodsReceiptIds: [] as string[],
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    supplierInvoiceNumber: '',
    supplierInvoiceDate: '',
  });
  
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [taxRate] = useState(5);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
    
    if (purchaseInvoice) {
      const loadDependencies = async () => {
        if (purchaseInvoice.vendorId) {
           await fetchPurchaseOrders(purchaseInvoice.vendorId);
        }
        if (purchaseInvoice.purchaseOrderId) {
           await fetchGoodsReceipts(purchaseInvoice.purchaseOrderId);
        }
      };

      loadDependencies();

      setFormData({
        vendorId: purchaseInvoice.vendorId?.toString() || '',
        purchaseOrderId: purchaseInvoice.purchaseOrderId?.toString() || '',
        goodsReceiptIds: purchaseInvoice.goodsReceiptIds || (purchaseInvoice.goodsReceiptId ? [purchaseInvoice.goodsReceiptId.toString()] : []),
        invoiceDate: purchaseInvoice.invoiceDate ? new Date(purchaseInvoice.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: purchaseInvoice.dueDate ? new Date(purchaseInvoice.dueDate).toISOString().split('T')[0] : '',
        notes: purchaseInvoice.notes || '',
        supplierInvoiceNumber: purchaseInvoice.supplierInvoiceNumber || '',
        supplierInvoiceDate: purchaseInvoice.supplierInvoiceDate ? new Date(purchaseInvoice.supplierInvoiceDate).toISOString().split('T')[0] : '',
      });
      setLineItems(purchaseInvoice.lineItems || []);
    }
  }, [purchaseInvoice]);

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll({ limit: 100, status: 'active' });
      const sortedVendors = (response.data?.data?.vendors || []).sort((a: any, b: any) => 
        a.vendorName.localeCompare(b.vendorName)
      );
      setVendors(sortedVendors);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchPurchaseOrders = async (vendorId: string) => {
    try {
      const response = await purchaseOrdersAPI.getAll({ vendorId, status: 'approved,received,partially_received', limit: 100 });
      const sortedPOs = (response.data?.data?.purchaseOrders || []).sort((a: any, b: any) => 
        a.poNumber.localeCompare(b.poNumber)
      );
      setPurchaseOrders(sortedPOs);
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  const fetchGoodsReceipts = async (poId: string) => {
    try {
      const response = await goodsReceiptsAPI.getByPO(parseInt(poId));
      // Handle both array and object response structures
      const data = response.data?.data?.goodsReceipts || response.data?.goodsReceipts || response.data || [];
      const grs = Array.isArray(data) ? data : [data];
      
      const sortedGRs = grs.sort((a: any, b: any) => a.grNumber.localeCompare(b.grNumber));
      setGoodsReceipts(sortedGRs);
    } catch (error) {
      console.error('Failed to fetch goods receipts:', error);
      setGoodsReceipts([]);
    }
  };

  const handleVendorChange = (vendorId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      vendorId, 
      purchaseOrderId: '', 
      goodsReceiptIds: [] 
    }));
    setLineItems([]);
    setPurchaseOrders([]);
    setGoodsReceipts([]);
    
    if (vendorId) {
      fetchPurchaseOrders(vendorId);
    }
  };

  const handlePOChange = (poId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      purchaseOrderId: poId, 
      goodsReceiptIds: [] 
    }));
    setLineItems([]);
    setGoodsReceipts([]);

    if (poId) {
      fetchGoodsReceipts(poId);
    }
  };

  const handleGRChange = async (grIds: string[]) => {
    setFormData(prev => ({ ...prev, goodsReceiptIds: grIds }));
    
    if (grIds.length === 0) {
      setLineItems([]);
      return;
    }

    try {
      const newItems: any[] = [];
      const processedItemIds = new Set(); // To avoid duplicates if same item exists in multiple GRNs?
      // Actually, if multiple GRNs have same item, they should probably be separate lines or aggregated?
      // Requirement says "Lines items must be according to the selected GRN's".
      // Usually GRNs have unique lines linked to PO lines.
      
      for (const grId of grIds) {
        // Find GR in local state if possible to avoid API call, but we might need full details
        const existingGR = goodsReceipts.find(g => g.id.toString() === grId);
        
        // If local GR has items, use them. Otherwise fetch.
        // Usually fetching by ID is safer to get latest details.
        const response = await goodsReceiptsAPI.getById(parseInt(grId));
        const gr = response.data?.data?.goodsReceipt || response.data;
        
        if (gr?.lineItems) {
          gr.lineItems.forEach((item: any) => {
            // We'll treat every line from every GR as a separate line item in the invoice
            // This is safer for tracking.
            newItems.push({
              item_id: item.item_id,
              itemName: item.item?.itemName || 'Unknown Item',
              itemCode: item.item?.itemCode || '',
              quantity: item.received_qty,
              unit_price: item.unit_price,
              tax_percent: 5, 
              total: (item.received_qty || 0) * (item.unit_price || 0),
              account_id: item.account_id, // Important: pass account_id
              grNumber: gr.grNumber
            });
          });
        }
      }
      setLineItems(newItems);
    } catch (error) {
      console.error('Failed to fetch GR details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load items from selected Goods Receipts',
        variant: 'destructive',
      });
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'unit_price' || field === 'quantity') {
      updated[index].total = (updated[index].quantity || 0) * (updated[index].unit_price || 0);
    }
    
    setLineItems(updated);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = lineItems.reduce((sum, item) => {
      // Calculate tax per item
      const itemTax = (item.total || 0) * (item.tax_percent || taxRate) / 100;
      return sum + itemTax;
    }, 0);
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendorId) {
      toast({ title: 'Validation Error', description: 'Please select a vendor', variant: 'destructive' });
      return;
    }
    
    if (!formData.purchaseOrderId) {
      toast({ title: 'Validation Error', description: 'Please select a purchase order', variant: 'destructive' });
      return;
    }

    if (lineItems.length === 0) {
      toast({ title: 'Validation Error', description: 'Please select at least one Goods Receipt with items', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      const { subtotal, taxAmount, totalAmount } = calculateTotals();

      const submitData = {
        ...formData,
        vendorId: parseInt(formData.vendorId),
        purchaseOrderId: parseInt(formData.purchaseOrderId),
        goodsReceiptId: formData.goodsReceiptIds.length > 0 ? parseInt(formData.goodsReceiptIds[0]) : null, // Backward compatibility for now
        goodsReceiptIds: formData.goodsReceiptIds, // New field to be handled by backend
        lineItems: lineItems.map(item => ({
          item_id: parseInt(item.item_id),
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          tax_percent: parseFloat(item.tax_percent),
          total: parseFloat(item.total),
          account_id: item.account_id,
          // Optional: passing source GR ID if we want to track it per line
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

  const vendorOptions = vendors.map(v => ({ value: v.id.toString(), label: v.vendorName }));
  const poOptions = purchaseOrders.map(po => ({ value: po.id.toString(), label: po.poNumber }));
  const grOptions = goodsReceipts.map(gr => ({ value: gr.id.toString(), label: `${gr.grNumber} (${gr.receiptDate})` }));

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
              <Combobox
                options={vendorOptions}
                value={formData.vendorId}
                onChange={handleVendorChange}
                placeholder="Select vendor"
                searchPlaceholder="Search vendor..."
              />
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
              <Label>Purchase Order *</Label>
              <Combobox
                options={poOptions}
                value={formData.purchaseOrderId}
                onChange={handlePOChange}
                placeholder="Select PO"
                searchPlaceholder="Search PO..."
                disabled={!formData.vendorId}
              />
            </div>

            <div className="space-y-2">
              <Label>Goods Receipts (Multiple) *</Label>
              <MultiSelectCombobox
                options={grOptions}
                value={formData.goodsReceiptIds}
                onChange={handleGRChange}
                placeholder="Select GRNs"
                searchPlaceholder="Search GRN..."
                disabled={!formData.purchaseOrderId}
              />
            </div>

            <div className="space-y-2">
              <Label>Supplier Invoice Number</Label>
              <Input
                value={formData.supplierInvoiceNumber}
                onChange={(e) => setFormData({ ...formData, supplierInvoiceNumber: e.target.value })}
                placeholder="Invoice number from supplier"
              />
            </div>

             <div className="space-y-2">
              <Label>Supplier Invoice Date</Label>
              <Input
                type="date"
                value={formData.supplierInvoiceDate}
                onChange={(e) => setFormData({ ...formData, supplierInvoiceDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
               <Label>Status</Label>
               <Input value="Draft" disabled className="bg-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Line Items (from selected GRNs)</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax %</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                   <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No items selected. Please select Goods Receipts.
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item, index) => (
                    <TableRow key={index}>
                       <TableCell>{item.grNumber || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{item.itemName}</span>
                          <span className="text-xs text-muted-foreground">{item.itemCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          disabled
                          className="bg-muted"
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
                      <TableCell>
                         <Input
                          type="number"
                          value={item.tax_percent}
                          onChange={(e) => updateLineItem(index, 'tax_percent', parseFloat(e.target.value) || 0)}
                          min="0"
                          max="100"
                          step="1"
                        />
                      </TableCell>
                      <TableCell>{item.total?.toFixed(2) || '0.00'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end space-x-4">
            <div className="text-right space-y-1">
              <div>Subtotal: {subtotal.toFixed(2)} AED</div>
              <div>Tax: {taxAmount.toFixed(2)} AED</div>
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
