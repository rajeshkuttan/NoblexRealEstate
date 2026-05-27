import { useState, useEffect } from 'react';
import { purchaseInvoicesAPI, vendorsAPI, purchaseOrdersAPI, goodsReceiptsAPI, itemsAPI, chartOfAccountsAPI, propertiesAPI, unitsAPI, leasesAPI, financialTransactionsAPI } from '@/services/api';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDocumentNumberingMode } from '@/hooks/useDocumentNumberingMode';

interface PurchaseInvoiceFormProps {
  purchaseInvoice?: any;
  onClose: (refresh?: boolean) => void;
}

export function PurchaseInvoiceForm({ purchaseInvoice, onClose }: PurchaseInvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    vendorId: '',
    purchaseOrderId: '',
    goodsReceiptId: '',
    goodsReceiptIds: [] as string[],
    invoiceDate: new Date().toISOString().split('T')[0],
    supplierInvoiceNumber: '',
    supplierInvoiceDate: '',
    dueDate: '',
    notes: '',
    status: 'draft',
    propertyId: '',
    unitId: '',
    leaseId: '',
    workOrderId: '',
    deliveryAddress: '',
    deliveryContactName: '',
    deliveryContactPhone: '',
    deliveryInstructions: '',
    discountType: 'amount',
    discountValue: 0,
  });
  
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [taxRate] = useState(5); // Default UAE VAT rate
  const { toast } = useToast();
  const { isManualNumbering, loading: numberingModeLoading } = useDocumentNumberingMode('Purchase Invoice');
  const { activeCompanyId } = useCompany();

  useEffect(() => {
    if (!activeCompanyId) return;
    setVendors([]);
    setAccounts([]);
    setFormData((prev) => ({ ...prev, vendorId: '' }));
    const initialize = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchVendors(),
          fetchItems(),
          fetchAccounts(),
          fetchProperties()
        ]);
        
        if (purchaseInvoice) {
          await populateForm();
        } else {
           setLineItems([]);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [purchaseInvoice, activeCompanyId]);

  useEffect(() => {
    if (formData.propertyId) {
      fetchUnits(parseInt(formData.propertyId));
    } else {
      setUnits([]);
      if (!loading) setFormData(prev => ({ ...prev, unitId: '', leaseId: '' }));
    }
  }, [formData.propertyId]);

  useEffect(() => {
    if (formData.unitId) {
      fetchLeases(parseInt(formData.unitId));
    } else {
      setLeases([]);
      if (!loading) setFormData(prev => ({ ...prev, leaseId: '' }));
    }
  }, [formData.unitId]);

  // Enrich line items with details from master items list AND populate missing GR Numbers
  useEffect(() => {
    // Only run if we have items to enrich or GRs to check
    if (lineItems.length > 0) {
      setLineItems(prevItems => {
        let hasChanges = false;
        const newItems = prevItems.map(li => {
          let updatedLi = { ...li };
          
          // 1. Enrich Item Name/Code
          if ((!updatedLi.itemName || updatedLi.itemName === 'Unknown Item') && updatedLi.item_id) {
            const matchedItem = allItems.find(i => i.id.toString() === updatedLi.item_id.toString());
            if (matchedItem) {
              updatedLi = { 
                ...updatedLi, 
                itemName: matchedItem.itemName, 
                itemCode: matchedItem.itemCode,
                account_id: updatedLi.account_id || matchedItem.accountId,
                unit_price: updatedLi.unit_price || matchedItem.costPrice || 0
              };
              hasChanges = true;
            }
          }

          // 2. Enrich GR Number if missing
          // This is critical for existing invoices that didn't save grNumber
          if ((!updatedLi.grNumber || updatedLi.grNumber === '') && goodsReceipts.length > 0) {
             // A. Priority: Match by explicit Goods Receipt ID
             if (updatedLi.goodsReceiptId) {
                 const exactGR = goodsReceipts.find(gr => gr.id.toString() === updatedLi.goodsReceiptId.toString());
                 if (exactGR) {
                     updatedLi.grNumber = exactGR.grNumber || exactGR.gr_number;
                     hasChanges = true;
                 }
             }
             // B. Fallback: Match by Item ID (Legacy support)
             else if (updatedLi.item_id) {
                 const relevantGRs = formData.goodsReceiptIds.length > 0 
                    ? goodsReceipts.filter(gr => formData.goodsReceiptIds.includes(gr.id.toString()))
                    : goodsReceipts;

                 const foundGR = relevantGRs.find(gr => {
                     let grItems = gr.lineItems || [];
                     if (typeof grItems === 'string') try { grItems = JSON.parse(grItems); } catch(e){}
                     return Array.isArray(grItems) && grItems.some((gri: any) => gri.item_id.toString() === updatedLi.item_id.toString());
                 });

                 if (foundGR) {
                     updatedLi.grNumber = foundGR.grNumber || foundGR.gr_number;
                     hasChanges = true;
                 }
             }
          }

          return updatedLi;
        });
        
        // Deep compare to avoid infinite loops if objects are superficially same but new references
        if (JSON.stringify(newItems) !== JSON.stringify(prevItems)) {
            return newItems;
        }
        return prevItems;
      });
    }
  }, [allItems, goodsReceipts, formData.goodsReceiptIds]); 

  const populateForm = async () => {
    try {
        setLoading(true);
        const pi = purchaseInvoice;

        // Fetch dependencies first
        await fetchVendors(); 
        if (pi.vendorId) await fetchPOs(pi.vendorId.toString());
        if (pi.purchaseOrderId) await fetchGRs(pi.purchaseOrderId.toString());

        // Parse JSON fields
        let lineItemsData = pi.lineItems || [];
        if (typeof lineItemsData === 'string') {
            try { lineItemsData = JSON.parse(lineItemsData); } catch (e) { lineItemsData = []; }
        }

        let goodsReceiptIdsData = pi.goodsReceiptIds || [];
        if (typeof goodsReceiptIdsData === 'string') {
            try { goodsReceiptIdsData = JSON.parse(goodsReceiptIdsData); } catch (e) { goodsReceiptIdsData = []; }
        }
        if (Array.isArray(goodsReceiptIdsData)) {
            goodsReceiptIdsData = goodsReceiptIdsData.map((id: any) => id.toString());
        } else {
             goodsReceiptIdsData = [];
        }

        setFormData({
            invoiceNumber: pi.invoiceNumber || '',
            vendorId: pi.vendorId?.toString() || '',
            purchaseOrderId: pi.purchaseOrderId?.toString() || '',
            goodsReceiptId: pi.goodsReceiptId?.toString() || '',
            goodsReceiptIds: goodsReceiptIdsData.length > 0 ? goodsReceiptIdsData : (pi.goodsReceiptId ? [pi.goodsReceiptId.toString()] : []),
            invoiceDate: pi.invoiceDate ? new Date(pi.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            supplierInvoiceNumber: pi.supplierInvoiceNumber || '',
            supplierInvoiceDate: pi.supplierInvoiceDate ? new Date(pi.supplierInvoiceDate).toISOString().split('T')[0] : '',
            dueDate: pi.dueDate ? new Date(pi.dueDate).toISOString().split('T')[0] : '',
            notes: pi.notes || '',
            status: pi.status || 'draft',
            propertyId: pi.propertyId?.toString() || '',
            unitId: pi.unitId?.toString() || '',
            leaseId: pi.leaseId?.toString() || '',
            workOrderId: pi.workOrderId?.toString() || '',
            deliveryAddress: pi.deliveryAddress || '',
            deliveryContactName: pi.deliveryContactName || '',
            deliveryContactPhone: pi.deliveryContactPhone || '',
            deliveryInstructions: pi.deliveryInstructions || '',
            discountType: pi.discountType || 'amount',
            discountValue: pi.discountValue || 0,
        });

        const itemsWithTax = lineItemsData.map((item: any) => {
            const matchedAccount = accounts.find(a => a.id.toString() === item.account_id?.toString());
            const resolvedItem = allItems.find(i => i.id.toString() === item.item_id?.toString());
            return {
                ...item,
                item_id: item.item_id?.toString() || '',
                grNumber: item.grNumber || item.gr_number || '',
                goodsReceiptId: item.goodsReceiptId,
                itemName: resolvedItem?.itemName || item.itemName || 'Unknown Item',
                itemCode: resolvedItem?.itemCode || item.itemCode || '',
                accountName: matchedAccount ? `${matchedAccount.accountCode} - ${matchedAccount.accountName}` : (item.account ? `${item.account.accountCode} - ${item.account.accountName}` : (item.accountName || '')),
                quantity: item.quantity || 0,
                unit_price: item.unit_price || 0,
                account_id: item.account_id,
                taxable: item.taxable !== false,
                tax_percent: item.tax_percent || (item.taxable !== false ? taxRate : 0),
                tax_classification: item.tax_classification || (item.taxable !== false ? 'Standard-Rated' : 'Exempt'),
                
                // Calculate derived fields for display
                subtotal: (item.quantity || 0) * (item.unit_price || 0),
                tax_amount: item.tax_amount || ((item.quantity || 0) * (item.unit_price || 0) * (item.tax_percent || 0) / 100),
                total: item.total || 0,
                discount_percent: item.discount_percent || 0,
                discount_amount: item.discount_amount || 0,
            };
        });
        setLineItems(itemsWithTax);

        if (pi.purchaseOrder) setSelectedPO(pi.purchaseOrder);
    } catch (error) {
        console.error("Error populating form", error);
    } finally {
        setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll({ limit: 100, status: 'active' });
      setVendors(response.data?.data?.vendors || []);
    } catch (error) { console.error('Failed to fetch vendors', error); }
  };

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAll({ limit: 100, isActive: true });
      const itemsArray = response.data?.data?.items || response.data?.data || [];
      const arrayToSet = Array.isArray(itemsArray) ? itemsArray : [];
      setAllItems(arrayToSet);
      setItems(arrayToSet);
    } catch (error) { console.error('Failed to fetch items', error); }
  };

  const fetchAccounts = async () => {
    try {
      const response = await chartOfAccountsAPI.getAll({ accountTypes: 'expense,asset', limit: 500 });
      setAccounts(response.data?.data?.accounts || []);
    } catch (error) { console.error('Failed to fetch accounts', error); }
  };

  const fetchProperties = async () => {
    try {
        const response = await propertiesAPI.getAll({ page: 1, limit: 100 });
        setProperties(response.data?.properties || []);
    } catch (error) { console.error('Failed to fetch properties', error); }
  };

  const fetchUnits = async (propId: number) => {
      try {
          const response = await unitsAPI.getByProperty(propId);
          setUnits(response.data?.data?.units || []);
      } catch (error) { console.error('Failed to fetch units', error); }
  };

  const fetchLeases = async (uId: number) => {
      try {
          const response = await leasesAPI.getByUnit(uId);
          setLeases(response.data?.data?.leases || []);
      } catch (error) { console.error('Failed to fetch leases', error); }
  };

  const fetchPOs = async (vendorId?: string) => {
    try {
      const params: any = { limit: 100, status: 'sent,acknowledged,partially_received,fully_received' };
      if (vendorId) params.vendorId = vendorId;
      const response = await purchaseOrdersAPI.getAll(params);
      setPurchaseOrders(response.data?.data?.purchaseOrders || []);
    } catch (error) { console.error('Failed to fetch POs', error); }
  };

  const fetchGRs = async (poId?: string) => {
      try {
          let response;
          if (poId) response = await goodsReceiptsAPI.getByPO(parseInt(poId));
          else response = await goodsReceiptsAPI.getAll({ limit: 100 });
          const grs = response.data?.data?.goodsReceipts || response.data?.goodsReceipts || [];
          setGoodsReceipts(Array.isArray(grs) ? grs : [grs]);
      } catch (error) { console.error('Failed to fetch GRs', error); }
  };

  const calculateTotals = () => {
    let rawSubtotal = 0;
    lineItems.forEach(item => {
      rawSubtotal += (item.quantity || 0) * (item.unit_price || 0);
    });

    let globalDiscountAmount = 0;
    if (formData.discountType === 'percentage') {
       globalDiscountAmount = (rawSubtotal * (formData.discountValue || 0)) / 100;
    } else {
       globalDiscountAmount = parseFloat(formData.discountValue?.toString() || '0');
    }

    if (globalDiscountAmount > rawSubtotal) globalDiscountAmount = rawSubtotal;

    let totalTax = 0;
    lineItems.forEach(item => {
       const itemGross = (item.quantity || 0) * (item.unit_price || 0);
       const itemShare = rawSubtotal > 0 ? (itemGross / rawSubtotal) : 0;
       const itemDiscount = globalDiscountAmount * itemShare;
       const itemTaxable = itemGross - itemDiscount;
       
       let itemTax = 0;
       if (item.taxable !== false && item.tax_classification !== 'Exempt' && item.tax_classification !== 'Zero-Rated' && item.tax_classification !== 'Out of Scope') {
           const rate = item.tax_percent || taxRate;
           itemTax = (itemTaxable * rate) / 100;
       }
       totalTax += itemTax;
    });

    const totalAmount = (rawSubtotal - globalDiscountAmount) + totalTax;

    return {
       subtotal: rawSubtotal,
       discountAmount: globalDiscountAmount,
       taxAmount: totalTax,
       totalAmount: totalAmount
    };
  };

  const { subtotal, discountAmount, taxAmount, totalAmount } = calculateTotals();

  const handleVendorChange = (vendorId: string) => {
    setFormData(prev => ({ ...prev, vendorId, purchaseOrderId: '', goodsReceiptIds: [] }));
    setPurchaseOrders([]);
    setGoodsReceipts([]);
    setLineItems([]);
    if (vendorId) fetchPOs(vendorId);
  };

  const handlePOChange = async (poId: string) => {
      setFormData(prev => ({ ...prev, purchaseOrderId: poId, goodsReceiptIds: [] }));
      setGoodsReceipts([]);
      setLineItems([]);
      
      if (poId) {
          fetchGRs(poId);
          const po = purchaseOrders.find(p => p.id.toString() === poId);
          if (po) {
              setSelectedPO(po);
              setFormData(prev => ({
                  ...prev,
                  propertyId: po.propertyId?.toString() || '',
                  unitId: po.unitId?.toString() || '',
                  deliveryAddress: po.deliveryAddress || '',
                  deliveryContactName: po.deliveryContactName || '',
                  deliveryContactPhone: po.deliveryContactPhone || '',
              }));
          }
      }
  };

  const handleGRChange = async (grIds: string[]) => {
      setFormData(prev => ({ ...prev, goodsReceiptIds: grIds }));
      if (grIds.length === 0) {
          setLineItems([]);
          return;
      }

      const newItems: any[] = [];
      for (const grId of grIds) {
          try {
              const response = await goodsReceiptsAPI.getById(parseInt(grId));
              const gr = response.data?.data?.goodsReceipt || response.data;
              if (gr?.lineItems) {
                 let items = gr.lineItems || [];
                 if (typeof items === 'string') try { items = JSON.parse(items); } catch(e){}
                 
                 items.forEach((item: any) => {
                      const qty = item.received_qty || item.quantity || 0;
                      const price = item.unit_price || 0;
                      const subtotal = qty * price;
                      
                      let accId = item.account_id || '';
                      if (!accId) {
                          const masterItem = allItems.find((i: any) => i.id === item.item_id);
                          if (masterItem) accId = masterItem.accountId;
                      }

                      const resolvedItem = allItems.find((i: any) => i.id === parseInt(item.item_id));
                      const itemName = resolvedItem?.itemName || item.item?.itemName || item.itemName || `Item ${item.item_id}`;
                      const itemCode = resolvedItem?.itemCode || item.item?.itemCode || item.itemCode || '';

                      newItems.push({
                          item_id: item.item_id,
                          itemName: itemName,
                          itemCode: itemCode,
                          grNumber: gr.grNumber || gr.gr_number || '',
                          quantity: qty,
                          unit_price: price,
                          tax_percent: taxRate,
                          taxable: true,
                          tax_classification: 'Standard-Rated',
                          subtotal: subtotal,
                          tax_amount: (subtotal * taxRate) / 100,
                          total: subtotal + ((subtotal * taxRate) / 100),
                          account_id: accId,
                          goodsReceiptId: gr.id // Track origin GR
                      });
                 });
              }
          } catch(e) { console.error(e); }
      }
      setLineItems(newItems);
  };

  const addLineItem = () => {
      setLineItems([...lineItems, {
          item_id: '',
          itemName: '',
          itemCode: '',
          quantity: 1,
          unit_price: 0,
          subtotal: 0,
          tax_percent: 5,
          tax_amount: 0,
          total: 0,
          grNumber: '',
          tax_classification: 'Standard-Rated',
          taxable: true
      }]);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
      const updated = [...lineItems];
      
      // Update the specific field
      updated[index] = { ...updated[index], [field]: value };
      
      const item = updated[index];
      
      // Allow overriding tax percent, but trigger recalc
      if (field === 'taxable') {
        if (!value) {
            updated[index].tax_percent = 0;
            updated[index].tax_classification = 'Exempt';
        } else {
            updated[index].tax_percent = 5;
            updated[index].tax_classification = 'Standard-Rated';
        }
      }

      if (field === 'tax_classification') {
          if (value === 'Standard-Rated') {
              updated[index].tax_percent = 5;
              updated[index].taxable = true;
          } else {
              updated[index].tax_percent = 0;
              updated[index].taxable = value !== 'Exempt' && value !== 'Out of Scope' && value !== 'Zero-Rated'; 
              // Usually these mean 0 tax, but let's stick to simple logic: these options -> 0 tax
          }
      }

      // If updating item_id, populate details
      if (field === 'item_id') {
          const matchedItem = items.find(i => i.id.toString() === value.toString());
          if (matchedItem) {
              updated[index].itemName = matchedItem.itemName;
              updated[index].itemCode = matchedItem.itemCode;
              updated[index].account_id = matchedItem.accountId;
              
              // Find account name from accounts list
              const matchedAccount = accounts.find(a => a.id.toString() === matchedItem.accountId?.toString());
              updated[index].accountName = matchedAccount ? `${matchedAccount.accountCode} - ${matchedAccount.accountName}` : '';
              
              updated[index].unit_price = matchedItem.costPrice || 0;
          }
      }

      // Recalculate totals for this row
      const qty = parseFloat(updated[index].quantity) || 0;
      const price = parseFloat(updated[index].unit_price) || 0;
      const subtotal = qty * price;
      updated[index].subtotal = subtotal;

      let taxAmt = 0;
      if (updated[index].taxable) {
          const rate = parseFloat(updated[index].tax_percent) || 0;
          taxAmt = (subtotal * rate) / 100;
      }
      updated[index].tax_amount = taxAmt;
      updated[index].total = subtotal + taxAmt;

      setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedInvoiceNumber = formData.invoiceNumber.trim();
      if (!purchaseInvoice?.id && isManualNumbering && !trimmedInvoiceNumber) {
          toast({ title: 'Validation Error', description: 'Please enter a purchase invoice number before saving', variant: 'destructive' });
          return;
      }
      if (!formData.vendorId || !formData.purchaseOrderId) {
          toast({ title: 'Validation Error', description: 'Vendor and PO are required', variant: 'destructive' });
          return;
      }

      setLoading(true);
      try {
          const { subtotal, discountAmount, taxAmount, totalAmount } = calculateTotals();
          const submitData = {
              ...formData,
              invoiceNumber: isManualNumbering ? trimmedInvoiceNumber : undefined,
              vendorId: parseInt(formData.vendorId),
              purchaseOrderId: parseInt(formData.purchaseOrderId),
              goodsReceiptId: formData.goodsReceiptIds.length > 0 ? parseInt(formData.goodsReceiptIds[0]) : null,
              goodsReceiptIds: formData.goodsReceiptIds,
              propertyId: formData.propertyId ? parseInt(formData.propertyId) : null,
              unitId: formData.unitId ? parseInt(formData.unitId) : null,
              leaseId: formData.leaseId ? parseInt(formData.leaseId) : null,
              workOrderId: formData.workOrderId ? parseInt(formData.workOrderId) : null,
              discountType: formData.discountType,
              discountValue: parseFloat(formData.discountValue?.toString() || '0'),
              
              subtotal,
              taxAmount,
              totalAmount,
              
              lineItems: lineItems.map(item => ({
                  ...item,
                  item_id: item.item_id ? parseInt(item.item_id) : null,
                  quantity: parseFloat(item.quantity),
                  unit_price: parseFloat(item.unit_price),
                  total: parseFloat(item.total),
                  tax_percent: parseFloat(item.tax_percent),
                  tax_amount: parseFloat(item.tax_amount),
                  taxable: item.taxable,
                  tax_classification: item.tax_classification,
                  grNumber: item.grNumber,
                  goodsReceiptId: item.goodsReceiptId
              }))
          };

          if (purchaseInvoice?.id) {
              await purchaseInvoicesAPI.update(purchaseInvoice.id, submitData);
              toast({ title: 'Success', description: 'Invoice updated' });
          } else {
              await purchaseInvoicesAPI.create(submitData);
              toast({ title: 'Success', description: 'Invoice created' });
          }
          onClose(true);
      } catch (error: any) {
          toast({ title: 'Error', description: error.response?.data?.message || 'Failed to save', variant: 'destructive' });
      } finally {
          setLoading(false);
      }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen rounded-none m-0 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{purchaseInvoice ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
          <form id="purchase-invoice-form" onSubmit={handleSubmit} className="space-y-8 pb-10">
             
             {/* General Information */}
             <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">General Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Vendor *</Label>
                       <Combobox 
                          options={vendors.map(v => ({ value: v.id.toString(), label: v.vendorName }))}
                          value={formData.vendorId}
                          onChange={handleVendorChange}
                          placeholder="Select Vendor"
                          className="w-full"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Invoice Number</Label>
                       <Input
                          className={`h-9 ${!isManualNumbering || !!purchaseInvoice ? 'bg-muted' : ''}`}
                          value={purchaseInvoice ? (purchaseInvoice.invoiceNumber || formData.invoiceNumber) : formData.invoiceNumber}
                          onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                          disabled={!!purchaseInvoice || numberingModeLoading || !isManualNumbering}
                          placeholder={isManualNumbering ? 'Enter invoice number' : 'Auto-generated'}
                        />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Status</Label>
                       <SearchableSelect
                          value={formData.status} 
                          onValueChange={val => setFormData({...formData, status: val})}
                          placeholder="Select Status"
                          searchPlaceholder="Search statuses..."
                          emptyMessage="No statuses found"
                          options={[
                            { value: 'draft', label: 'Draft' },
                            { value: 'pending_approval', label: 'Pending Approval' },
                            { value: 'approved', label: 'Approved' },
                            { value: 'paid', label: 'Paid' },
                            { value: 'cancelled', label: 'Cancelled' },
                          ]}
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Invoice Date *</Label>
                       <Input type="date" className="h-9" value={formData.invoiceDate} onChange={e => setFormData({...formData, invoiceDate: e.target.value})} />
                    </div>
                     <div className="space-y-2">
                       <Label className="text-sm font-medium">Due Date</Label>
                       <Input type="date" className="h-9" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Supplier Inv #</Label>
                       <Input className="h-9" value={formData.supplierInvoiceNumber} onChange={e => setFormData({...formData, supplierInvoiceNumber: e.target.value})} placeholder="e.g. INV-123" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Supplier Inv Date</Label>
                       <Input type="date" className="h-9" value={formData.supplierInvoiceDate} onChange={e => setFormData({...formData, supplierInvoiceDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Purchase Order *</Label>
                       <Combobox 
                          options={purchaseOrders.map(po => ({ value: po.id.toString(), label: po.poNumber }))}
                          value={formData.purchaseOrderId}
                          onChange={handlePOChange}
                          placeholder="Select PO"
                          disabled={!formData.vendorId}
                          className="w-full"
                       />
                    </div>
                     <div className="space-y-2">
                       <Label className="text-sm font-medium">Goods Receipts *</Label>
                       <MultiSelectCombobox 
                          options={goodsReceipts.map(gr => ({ value: gr.id.toString(), label: `${gr.grNumber || gr.gr_number} (${gr.receiptDate})` }))}
                          value={formData.goodsReceiptIds}
                          onChange={handleGRChange}
                          placeholder="Select GRNs"
                          disabled={!formData.purchaseOrderId}
                          className="w-full"
                       />
                    </div>
                </div>
             </div>

             {/* Real Estate Association (Optional) */}
             <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Real Estate Association (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Property</Label>
                       <Combobox 
                           options={properties.map(p => ({ value: p.id.toString(), label: p.title }))}
                           value={formData.propertyId}
                           onChange={val => setFormData({...formData, propertyId: val})}
                           placeholder="Select Property"
                           className="w-full"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Unit</Label>
                       <Combobox 
                           options={units.map(u => ({ value: u.id.toString(), label: u.unitNumber }))}
                           value={formData.unitId}
                           onChange={val => setFormData({...formData, unitId: val})}
                           placeholder="Select Unit"
                           disabled={!formData.propertyId}
                           className="w-full"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Lease</Label>
                        <Combobox 
                           options={leases.map(l => ({ value: l.id.toString(), label: `Lease #${l.id}` }))}
                           value={formData.leaseId}
                           onChange={val => setFormData({...formData, leaseId: val})}
                           placeholder="Select Lease"
                           disabled={!formData.unitId}
                           className="w-full"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Work Order</Label>
                       <Input className="h-9" value={formData.workOrderId} onChange={e => setFormData({...formData, workOrderId: e.target.value})} placeholder="Optional" />
                    </div>
                </div>
             </div>

             {/* Delivery Information */}
             <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Delivery Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <Label className="text-sm font-medium">Delivery Address</Label>
                       <Textarea className="min-h-[80px]" value={formData.deliveryAddress} onChange={e => setFormData({...formData, deliveryAddress: e.target.value})} placeholder="Enter full delivery address" />
                    </div>
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <Label className="text-sm font-medium">Contact Name</Label>
                               <Input className="h-9" value={formData.deliveryContactName} onChange={e => setFormData({...formData, deliveryContactName: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-sm font-medium">Contact Phone</Label>
                               <Input className="h-9" value={formData.deliveryContactPhone} onChange={e => setFormData({...formData, deliveryContactPhone: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2 mt-2">
                           <Label className="text-sm font-medium">Delivery Instructions</Label>
                           <Input className="h-9" value={formData.deliveryInstructions} onChange={e => setFormData({...formData, deliveryInstructions: e.target.value})} />
                        </div>
                    </div>
                </div>
             </div>

             {/* Line Items */}
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <Label className="text-lg font-semibold text-foreground">Line Items</Label>
                   <Button type="button" size="sm" variant="default" onClick={addLineItem} className="h-9 px-4 shadow-sm">
                      <Plus className="h-4 w-4 mr-2" /> Add Item
                   </Button>
                </div>
                
                <div className="border rounded-lg shadow-sm overflow-hidden bg-card">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[1200px]">
                       <TableHeader className="bg-muted/40">
                          <TableRow className="hover:bg-transparent border-b border-border">
                             <TableHead className="w-[150px] font-medium text-foreground">GRN</TableHead>
                             <TableHead className="min-w-[150px] font-medium text-foreground">Item</TableHead>
                             <TableHead className="w-[150px] font-medium text-foreground">Account</TableHead>
                             <TableHead className="w-[80px] font-medium text-foreground">Qty</TableHead>
                             <TableHead className="w-[100px] font-medium text-foreground">Price</TableHead>
                             <TableHead className="w-[100px] font-medium text-foreground">Subtotal</TableHead>
                             <TableHead className="w-[70px] text-center font-medium text-foreground">Taxable</TableHead>
                             <TableHead className="w-[140px] font-medium text-foreground">Tax Type</TableHead>
                             <TableHead className="w-[80px] font-medium text-foreground">Tax %</TableHead>
                             <TableHead className="w-[90px] font-medium text-foreground">Tax Amt</TableHead>
                             <TableHead className="w-[100px] text-right font-medium text-foreground">Total</TableHead>
                             <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {lineItems.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                                   <div className="flex flex-col items-center justify-center gap-2">
                                      <div className="p-3 rounded-full bg-muted/50">
                                        <Plus className="h-6 w-6 text-muted-foreground/60" />
                                      </div>
                                      <p>No items added yet. Select a Goods Receipt or click "Add Item" to start.</p>
                                   </div>
                                </TableCell>
                             </TableRow>
                          ) : (
                             lineItems.map((item, index) => (
                               <TableRow key={index} className="hover:bg-muted/10">
                                  <TableCell className="align-top py-4">
                                     {item.grNumber ? (
                                        <Badge variant="outline" className="text-[1rem] px-1 py-0.5 h-5 font-mono bg-background">{item.grNumber}</Badge>
                                     ) : (
                                        <span className="text-muted-foreground text-xs pl-2">-</span>
                                     )}
                                  </TableCell>
                                  <TableCell className="align-top py-4">
                                     {(item.itemName && item.item_id && item.grNumber) ? (
                                           <div className="flex flex-col gap-1">
                                             <span className="font-bold text-sm text-slate-900 leading-tight">
                                                {(() => {
                                                  const resolved = allItems.find(i => i.id === parseInt(item.item_id));
                                                  return resolved?.itemName || item.item?.itemName || item.itemName || `Item ${item.item_id}`;
                                                })()}
                                             </span>
                                             <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider">
                                                {(() => {
                                                  const resolved = allItems.find(i => i.id === parseInt(item.item_id));
                                                  return resolved?.itemCode || item.item?.itemCode || item.itemCode;
                                                })()}
                                             </span>
                                          </div>
                                     ) : (
                                         <Combobox 
                                            options={items.map(i => ({ value: i.id.toString(), label: i.itemName }))}
                                            value={item.item_id?.toString()}
                                            onChange={val => updateLineItem(index, 'item_id', val)}
                                            placeholder="Select Item..."
                                            className="w-full"
                                         />
                                     )}
                                  </TableCell>
                                  <TableCell className="align-top py-4">
                                     <div className="h-9 flex items-center px-3 rounded-md bg-muted/30 text-xs text-muted-foreground truncate" title={item.accountName || 'Auto-fetched from Item'}>
                                         {item.accountName || 'Auto-fetched from Item'}
                                     </div>
                                  </TableCell>
                                  <TableCell className="align-top py-4">
                                     <Input type="number" min="0" className="h-9 w-full text-center" value={item.quantity} onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value))} />
                                  </TableCell>
                                  <TableCell className="align-top py-4">
                                     <Input type="number" min="0" className="h-9 w-full text-right" value={item.unit_price} onChange={e => updateLineItem(index, 'unit_price', parseFloat(e.target.value))} />
                                  </TableCell>
                                  <TableCell className="align-top py-4">
                                     <div className="h-9 flex items-center justify-end px-3 rounded-md bg-muted/30 font-medium text-sm">
                                         {(item.subtotal || ((item.quantity||0)*(item.unit_price||0))).toFixed(2)}
                                     </div>
                                  </TableCell>
                                  <TableCell className="align-top py-4 text-center">
                                     <div className="flex justify-center h-9 items-center">
                                         <Checkbox 
                                             checked={item.taxable} 
                                             onCheckedChange={(checked) => updateLineItem(index, 'taxable', checked)}
                                             className="h-5 w-5"
                                         />
                                     </div>
                                  </TableCell>
                                  <TableCell className="align-top py-4">
                                      <SearchableSelect
                                        value={item.tax_classification} 
                                        onValueChange={val => updateLineItem(index, 'tax_classification', val)}
                                        placeholder="Tax type"
                                        searchPlaceholder="Search tax types..."
                                        emptyMessage="No tax types found"
                                        className="h-9 w-full text-xs"
                                        options={[
                                          { value: 'Standard-Rated', label: 'Standard-Rated' },
                                          { value: 'Zero-Rated', label: 'Zero-Rated' },
                                          { value: 'Exempt', label: 'Exempt' },
                                          { value: 'Out of Scope', label: 'Out of Scope' },
                                        ]}
                                      />
                                  </TableCell>
                                  <TableCell className="align-top py-4">
                                     <div className="relative w-20">
                                         <Input 
                                             type="number" 
                                             min="0" 
                                             className="h-9 text-right pr-6" 
                                             value={item.tax_percent} 
                                             readOnly
                                         />
                                         <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">%</span>
                                     </div>
                                  </TableCell>
                                  <TableCell className="align-top py-4">
                                     <div className="h-9 flex items-center justify-end px-3 rounded-md bg-muted/30 text-sm text-muted-foreground">
                                         {parseFloat(item.tax_amount || 0).toFixed(2)}
                                     </div>
                                  </TableCell>
                                  <TableCell className="align-top py-4">
                                     <div className="h-9 flex items-center justify-end px-3 rounded-md bg-accent/10 font-bold text-sm">
                                         {parseFloat(item.total || 0).toFixed(2)}
                                     </div>
                                  </TableCell>
                                  <TableCell className="align-top py-4 text-center">
                                     <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                                        onClick={() => {
                                            const newItems = [...lineItems];
                                            newItems.splice(index, 1);
                                            setLineItems(newItems);
                                        }}
                                     >
                                        <Trash2 className="h-4 w-4" />
                                     </Button>
                                  </TableCell>
                               </TableRow>
                              ))
                          )}
                       </TableBody>
                    </Table>
                </div>
                </div>
              </div>
                
                {/* Global Discount & Totals */}
                <div className="flex flex-col items-end space-y-4 pt-4 border-t">
                    <div className="w-[400px] space-y-3">
                        <div className="flex items-center justify-between">
                             <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
                             <span className="font-semibold">{subtotal.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm whitespace-nowrap">Discount</Label>
                                <SearchableSelect
                                    value={formData.discountType} 
                                    onValueChange={(val) => setFormData({...formData, discountType: val})}
                                    placeholder="Type"
                                    searchPlaceholder="Search discount types..."
                                    emptyMessage="No discount types found"
                                    className="h-8 w-[140px]"
                                    options={[
                                      { value: 'amount', label: 'Amount (AED)' },
                                      { value: 'percentage', label: 'Percentage (%)' },
                                    ]}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-[150px]">
                                <Input 
                                    type="number" 
                                    className="h-8 text-right"
                                    min="0"
                                    step="0.01"
                                    value={formData.discountValue}
                                    onChange={(e) => setFormData({...formData, discountValue: parseFloat(e.target.value) || 0})}
                                />
                            </div>
                        </div>

                        {discountAmount > 0 && (
                            <div className="flex items-center justify-between text-red-500">
                                <span className="text-sm">Discount Amount</span>
                                <span>- {discountAmount.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                             <span className="text-sm font-medium text-muted-foreground">Tax (VAT)</span>
                             <span className="font-semibold">{taxAmount.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between border-t pt-3 mt-2">
                             <span className="text-base font-bold">Total Amount</span>
                             <span className="text-xl font-bold text-primary">{totalAmount.toFixed(2)} AED</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes / Terms</Label>
                  <Textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="Enter specific notes, payment terms, etc."
                    className="min-h-[100px]"
                  />
                </div>
              </form>
          </ScrollArea>

          <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => onClose()} className="h-10 px-6">
              Cancel
            </Button>
            <Button type="submit" form="purchase-invoice-form" disabled={loading} className="h-10 px-8 bg-blue-600 hover:bg-blue-700 shadow-md">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {purchaseInvoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  );
}

export default PurchaseInvoiceForm;
