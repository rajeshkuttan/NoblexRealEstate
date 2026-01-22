import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseInvoicesAPI, vendorsAPI, purchaseOrdersAPI, goodsReceiptsAPI, itemsAPI, chartOfAccountsAPI, propertiesAPI, unitsAPI, leasesAPI, financialTransactionsAPI } from '@/services/api';
import { cacheService } from '@/services/cache';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Loader2, Plus, Trash2, ArrowLeft, Check, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export default function PurchaseInvoicePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [newItemData, setNewItemData] = useState({
    itemName: '',
    itemCategory: 'material',
    unitOfMeasure: 'pcs',
    accountId: '',
    description: '',
  });
  const [itemErrors, setItemErrors] = useState<{ [key: string]: string }>({});
  const [creatingForLineItemIndex, setCreatingForLineItemIndex] = useState<number | null>(null);
  const [openItemPopovers, setOpenItemPopovers] = useState<{ [key: number]: boolean }>({});
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [selectedGR, setSelectedGR] = useState<any>(null);
  const [accountingEntries, setAccountingEntries] = useState<any[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [formData, setFormData] = useState({
    vendorId: '',
    purchaseOrderId: '',
    goodsReceiptId: '',
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
  });
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [taxRate] = useState(5); // Default UAE VAT rate
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
    fetchItems();
    fetchAccounts();
    fetchProperties();
    fetchPOs();
    fetchGRs();
    if (id) {
      fetchPurchaseInvoice();
    } else {
      setLineItems([{ item_id: '', quantity: 1, unit_price: 0, total: 0, taxable: true, tax_percent: taxRate, tax_classification: 'Standard-Rated', tax_amount: 0 }]);
    }
  }, [id]);

  useEffect(() => {
    if (formData.propertyId) {
      fetchUnits(parseInt(formData.propertyId));
    } else {
      setUnits([]);
      setFormData(prev => ({ ...prev, unitId: '', leaseId: '' }));
    }
  }, [formData.propertyId]);

  useEffect(() => {
    if (formData.unitId) {
      fetchLeases(parseInt(formData.unitId));
    } else {
      setLeases([]);
      setFormData(prev => ({ ...prev, leaseId: '' }));
    }
  }, [formData.unitId]);

  useEffect(() => {
    // Auto-populate delivery address when property/unit selected
    if (formData.propertyId || formData.unitId) {
      updateDeliveryAddress();
    }
  }, [formData.propertyId, formData.unitId]);

  const fetchPurchaseInvoice = async () => {
    try {
      setFetching(true);
      const response = await purchaseInvoicesAPI.getById(parseInt(id!));
      const pi = response.data?.data?.purchaseInvoice || response.data?.data;
      
      if (!pi) {
        toast({
          title: 'Error',
          description: 'Purchase invoice not found',
          variant: 'destructive',
        });
        navigate('/procurement');
        return;
      }

      console.log('Fetched PI:', pi);

      // Parse lineItems if it's a string
      let lineItemsData = pi.lineItems || [];
      if (typeof lineItemsData === 'string') {
        try {
          lineItemsData = JSON.parse(lineItemsData);
        } catch (e) {
          console.error('Failed to parse lineItems:', e);
          lineItemsData = [];
        }
      }

      setFormData({
        vendorId: pi.vendorId?.toString() || pi.vendor_id?.toString() || '',
        purchaseOrderId: pi.purchaseOrderId?.toString() || pi.purchase_order_id?.toString() || '',
        goodsReceiptId: pi.goodsReceiptId?.toString() || pi.goods_receipt_id?.toString() || '',
        invoiceDate: pi.invoiceDate ? new Date(pi.invoiceDate).toISOString().split('T')[0] : (pi.invoice_date ? new Date(pi.invoice_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        supplierInvoiceNumber: pi.supplierInvoiceNumber || pi.supplier_invoice_number || '',
        supplierInvoiceDate: pi.supplierInvoiceDate ? new Date(pi.supplierInvoiceDate).toISOString().split('T')[0] : (pi.supplier_invoice_date ? new Date(pi.supplier_invoice_date).toISOString().split('T')[0] : ''),
        dueDate: pi.dueDate ? new Date(pi.dueDate).toISOString().split('T')[0] : (pi.due_date ? new Date(pi.due_date).toISOString().split('T')[0] : ''),
        notes: pi.notes || '',
        status: pi.status || 'draft',
        propertyId: pi.propertyId?.toString() || pi.property_id?.toString() || '',
        unitId: pi.unitId?.toString() || pi.unit_id?.toString() || '',
        leaseId: pi.leaseId?.toString() || pi.lease_id?.toString() || '',
        workOrderId: pi.workOrderId?.toString() || pi.work_order_id?.toString() || '',
        deliveryAddress: pi.deliveryAddress || pi.delivery_address || '',
        deliveryContactName: pi.deliveryContactName || pi.delivery_contact_name || '',
        deliveryContactPhone: pi.deliveryContactPhone || pi.delivery_contact_phone || '',
        deliveryInstructions: pi.deliveryInstructions || pi.delivery_instructions || '',
      });

      // Set line items with tax fields
      const itemsWithTax = lineItemsData.map((item: any) => ({
        item_id: item.item_id?.toString() || '',
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total: item.total || 0,
        account_id: item.account_id,
        taxable: item.taxable !== false,
        tax_percent: item.tax_percent || (item.taxable !== false ? taxRate : 0),
        tax_classification: item.tax_classification || (item.taxable !== false ? 'Standard-Rated' : 'Exempt'),
        tax_amount: item.tax_amount || 0,
      }));
      setLineItems(itemsWithTax);

      // Set selected PO/GR if they exist
      if (pi.purchaseOrder) {
        setSelectedPO(pi.purchaseOrder);
      }
      if (pi.goodsReceipt) {
        setSelectedGR(pi.goodsReceipt);
      }
      
      // Set invoice number and fetch accounting entries if invoice is approved
      if (pi.invoiceNumber) {
        setInvoiceNumber(pi.invoiceNumber);
        if (pi.status === 'approved') {
          fetchAccountingEntries(pi.invoiceNumber);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch purchase invoice:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch purchase invoice',
        variant: 'destructive',
      });
      navigate('/procurement');
    } finally {
      setFetching(false);
    }
  };

  const fetchAccountingEntries = async (reference: string) => {
    try {
      setLoadingEntries(true);
      const response = await financialTransactionsAPI.getByReference(reference);
      const transactions = response.data?.data?.transactions || [];
      setAccountingEntries(transactions);
    } catch (error: any) {
      console.error('Failed to fetch accounting entries:', error);
      setAccountingEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  };

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
      const response = await itemsAPI.getAll({ limit: 100, isActive: true });
      setItems(response.data?.data?.items || []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchPOs = async () => {
    try {
      const response = await purchaseOrdersAPI.getAll({ limit: 100 });
      const pos = response.data?.data?.purchaseOrders || response.data?.data || [];
      setPurchaseOrders(Array.isArray(pos) ? pos : []);
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
    }
  };

  const fetchGRs = async () => {
    try {
      const response = await goodsReceiptsAPI.getAll({ limit: 100 });
      const grs = response.data?.data?.goodsReceipts || response.data?.data || [];
      setGoodsReceipts(Array.isArray(grs) ? grs : []);
    } catch (error) {
      console.error('Failed to fetch goods receipts:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await chartOfAccountsAPI.getAll({ accountTypes: 'expense,asset', limit: 500 });
      const data = response.data?.data?.accounts || response.data?.accounts || [];
      const filteredAccounts = data.filter((acc: any) => 
        acc.accountType === 'expense' || acc.accountType === 'asset'
      );
      setAccounts(filteredAccounts);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await propertiesAPI.getAll({ page: 1, limit: 100 });
      const propertiesData = response.data?.properties || [];
      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setProperties([]);
    }
  };

  const fetchUnits = async (propertyId: number) => {
    try {
      const response = await unitsAPI.getByProperty(propertyId);
      const unitsData = response.data?.data?.units || response.data?.data || response.data || [];
      setUnits(Array.isArray(unitsData) ? unitsData : []);
    } catch (error) {
      console.error('Failed to fetch units:', error);
      setUnits([]);
    }
  };

  const fetchLeases = async (unitId: number) => {
    try {
      const response = await leasesAPI.getByUnit(unitId);
      const leasesData = response.data?.data?.leases || response.data?.data || response.data || [];
      setLeases(Array.isArray(leasesData) ? leasesData : []);
    } catch (error) {
      console.error('Failed to fetch leases:', error);
      setLeases([]);
    }
  };

  const updateDeliveryAddress = async () => {
    if (!formData.propertyId) {
      return;
    }

    try {
      const property = properties.find(p => p.id.toString() === formData.propertyId);
      if (!property) return;

      let addressParts = [property.location || ''];
      if (property.emirate) addressParts.push(property.emirate);
      if (property.community) addressParts.push(property.community);

      if (formData.unitId) {
        const unit = units.find(u => u.id.toString() === formData.unitId);
        if (unit) {
          addressParts.push(`Unit ${unit.unitNumber || unit.unit_number || ''}`);
        }
      }

      const address = addressParts.filter(Boolean).join(', ');
      if (address) {
        setFormData(prev => ({ ...prev, deliveryAddress: address }));
      }
    } catch (error) {
      console.error('Failed to update delivery address:', error);
    }
  };

  const handlePOSelect = async (poId: string) => {
    if (!poId || poId === 'none') {
      setSelectedPO(null);
      setFormData(prev => ({ ...prev, purchaseOrderId: '' }));
      return;
    }

    try {
      const response = await purchaseOrdersAPI.getById(parseInt(poId));
      const po = response.data?.data?.purchaseOrder || response.data?.data;
      
      if (po) {
        setSelectedPO(po);
        
        // Auto-populate line items from PO
        if (po.lineItems) {
          let poLineItems = po.lineItems;
          if (typeof poLineItems === 'string') {
            try {
              poLineItems = JSON.parse(poLineItems);
            } catch (e) {
              console.error('Failed to parse PO lineItems:', e);
              poLineItems = [];
            }
          }
          
          const mappedLineItems = poLineItems.map((item: any) => {
            // Calculate subtotal
            const quantity = item.quantity || 0;
            const unitPrice = item.unit_price || 0;
            const subtotal = quantity * unitPrice;
            
            // Get tax information from PO (preserve tax classification and settings)
            const taxClassification = item.tax_classification || (item.taxable === false ? 'Exempt' : 'Standard-Rated');
            const isTaxable = taxClassification !== 'Exempt';
            let taxPercent = 0;
            let taxAmount = 0;
            
            if (taxClassification === 'Standard-Rated' || taxClassification === 'Standard-Rated (5%)') {
              taxPercent = item.tax_percent || taxRate;
              taxAmount = item.tax_amount || (subtotal * taxPercent) / 100;
            } else if (taxClassification === 'Zero-Rated' || taxClassification === 'Zero-Rated (0%)') {
              taxPercent = 0;
              taxAmount = 0;
            } else {
              // Exempt
              taxPercent = 0;
              taxAmount = 0;
            }
            
            // Ensure account_id is set - get from items list if not in PO line item
            let accountId = item.account_id;
            if (!accountId) {
              const itemRecord = items.find(i => i.id.toString() === item.item_id?.toString());
              if (itemRecord && itemRecord.accountId) {
                accountId = itemRecord.accountId;
              }
            }
            
            return {
              item_id: item.item_id?.toString() || '',
              quantity: quantity,
              unit_price: unitPrice,
              total: subtotal,
              account_id: accountId,
              taxable: isTaxable,
              tax_percent: taxPercent,
              tax_classification: taxClassification,
              tax_amount: taxAmount,
            };
          });
          setLineItems(mappedLineItems);
        }

        // Auto-populate delivery info from PO
        setFormData(prev => ({
          ...prev,
          purchaseOrderId: poId,
          propertyId: po.propertyId?.toString() || po.property_id?.toString() || prev.propertyId,
          unitId: po.unitId?.toString() || po.unit_id?.toString() || prev.unitId,
          leaseId: po.leaseId?.toString() || po.lease_id?.toString() || prev.leaseId,
          workOrderId: po.workOrderId?.toString() || po.work_order_id?.toString() || prev.workOrderId,
          deliveryAddress: po.deliveryAddress || po.delivery_address || prev.deliveryAddress,
          deliveryContactName: po.deliveryContactName || po.delivery_contact_name || prev.deliveryContactName,
          deliveryContactPhone: po.deliveryContactPhone || po.delivery_contact_phone || prev.deliveryContactPhone,
          deliveryInstructions: po.deliveryInstructions || po.delivery_instructions || prev.deliveryInstructions,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch PO details:', error);
    }
  };

  const handleGRSelect = async (grId: string) => {
    if (!grId || grId === 'none') {
      setSelectedGR(null);
      setFormData(prev => ({ ...prev, goodsReceiptId: '' }));
      return;
    }

    try {
      const response = await goodsReceiptsAPI.getById(parseInt(grId));
      const gr = response.data?.data?.goodsReceipt || response.data?.data;
      
      if (gr) {
        setSelectedGR(gr);
        
        // Auto-populate line items from GR
        if (gr.lineItems) {
          let grLineItems = gr.lineItems;
          if (typeof grLineItems === 'string') {
            try {
              grLineItems = JSON.parse(grLineItems);
            } catch (e) {
              console.error('Failed to parse GR lineItems:', e);
              grLineItems = [];
            }
          }
          
          const mappedLineItems = grLineItems.map((item: any) => {
            // Calculate subtotal
            const quantity = item.received_qty || item.quantity || 0;
            const unitPrice = item.unit_price || 0;
            const subtotal = quantity * unitPrice;
            
            // Get tax information from GRN (preserve tax classification and settings)
            const taxClassification = item.tax_classification || (item.taxable === false ? 'Exempt' : 'Standard-Rated');
            const isTaxable = taxClassification !== 'Exempt';
            let taxPercent = 0;
            let taxAmount = 0;
            
            if (taxClassification === 'Standard-Rated' || taxClassification === 'Standard-Rated (5%)') {
              taxPercent = item.tax_percent || taxRate;
              taxAmount = item.tax_amount || (subtotal * taxPercent) / 100;
            } else if (taxClassification === 'Zero-Rated' || taxClassification === 'Zero-Rated (0%)') {
              taxPercent = 0;
              taxAmount = 0;
            } else {
              // Exempt
              taxPercent = 0;
              taxAmount = 0;
            }
            
            // Ensure account_id is set - get from items list if not in GRN line item
            let accountId = item.account_id;
            if (!accountId) {
              const itemRecord = items.find(i => i.id.toString() === item.item_id?.toString());
              if (itemRecord && itemRecord.accountId) {
                accountId = itemRecord.accountId;
              }
            }
            
            return {
              item_id: item.item_id?.toString() || '',
              quantity: quantity,
              unit_price: unitPrice,
              total: subtotal,
              account_id: accountId,
              taxable: isTaxable,
              tax_percent: taxPercent,
              tax_classification: taxClassification,
              tax_amount: taxAmount,
            };
          });
          setLineItems(mappedLineItems);
        }

        // Auto-populate delivery info from GR
        setFormData(prev => ({
          ...prev,
          goodsReceiptId: grId,
          propertyId: gr.deliveryPropertyId?.toString() || gr.delivery_property_id?.toString() || prev.propertyId,
          unitId: gr.deliveryUnitId?.toString() || gr.delivery_unit_id?.toString() || prev.unitId,
          deliveryAddress: gr.deliveryAddress || gr.delivery_address || prev.deliveryAddress,
          deliveryContactName: gr.deliveryContactName || gr.delivery_contact_name || prev.deliveryContactName,
          deliveryContactPhone: gr.deliveryContactPhone || gr.delivery_contact_phone || prev.deliveryContactPhone,
          deliveryInstructions: gr.deliveryNotes || gr.delivery_notes || prev.deliveryInstructions,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch GR details:', error);
    }
  };

  const handleCreateItem = async () => {
    // Validate
    const errors: { [key: string]: string } = {};
    if (!newItemData.itemName.trim()) {
      errors.itemName = 'Item name is required';
    }
    if (!newItemData.accountId) {
      errors.accountId = 'Account is required';
    }
    setItemErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingItem(true);
      const response = await itemsAPI.create({
        itemName: newItemData.itemName,
        itemCategory: newItemData.itemCategory,
        unitOfMeasure: newItemData.unitOfMeasure,
        accountId: parseInt(newItemData.accountId),
        description: newItemData.description,
      });

      const newItem = response.data?.data || response.data;
      if (newItem) {
        // Add to items list
        setItems([...items, newItem]);
        
        // Set the item_id for the line item that triggered this
        if (creatingForLineItemIndex !== null) {
          updateLineItem(creatingForLineItemIndex, 'item_id', newItem.id.toString());
        }
        
        toast({
          title: 'Success',
          description: 'Item created successfully and added to line item',
        });
        
        // Reset form and close dialog
        setNewItemData({
          itemName: '',
          itemCategory: 'material',
          unitOfMeasure: 'pcs',
          accountId: '',
          description: '',
        });
        setItemErrors({});
        setCreatingForLineItemIndex(null);
        setShowItemDialog(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create item',
        variant: 'destructive',
      });
    } finally {
      setCreatingItem(false);
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
    
    // Handle item_id change - fetch account_id
    if (field === 'item_id' && value) {
      const item = items.find(i => i.id.toString() === value);
      if (item) {
        updated[index].account_id = item.accountId;
      }
    }
    
    // Handle tax classification changes
    if (field === 'tax_classification') {
      const classification = value;
      if (classification === 'Exempt') {
        updated[index].taxable = false;
        updated[index].tax_percent = 0;
      } else if (classification === 'Zero-Rated' || classification === 'Zero-Rated (0%)') {
        updated[index].taxable = true;
        updated[index].tax_percent = 0;
      } else if (classification === 'Standard-Rated' || classification === 'Standard-Rated (5%)') {
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
      if (classification === 'Standard-Rated' || classification === 'Standard-Rated (5%)') {
        updated[index].tax_percent = taxRate;
        updated[index].tax_amount = (subtotal * taxRate) / 100;
      } else if (classification === 'Zero-Rated' || classification === 'Zero-Rated (0%)' || classification === 'Exempt') {
        updated[index].tax_amount = 0;
        updated[index].tax_percent = 0;
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

    if (!formData.vendorId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a vendor',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.dueDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a due date',
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

    // Ensure account_id is set for all line items
    const validatedLineItems = lineItems.map(item => {
      // If account_id is missing, try to get it from the items list
      if (!item.account_id) {
        const selectedItem = items.find(i => i.id.toString() === item.item_id?.toString());
        if (selectedItem && selectedItem.accountId) {
          item.account_id = selectedItem.accountId;
        }
      }
      return item;
    });

    // Check if any line item still doesn't have account_id
    const missingAccountId = validatedLineItems.some(item => !item.account_id);
    if (missingAccountId) {
      toast({
        title: 'Validation Error',
        description: 'Some items are missing account information. Please ensure all items have an associated account.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { subtotal, taxAmount, totalAmount } = calculateTotals();

      const submitData = {
        vendorId: parseInt(formData.vendorId),
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        purchaseOrderId: formData.purchaseOrderId ? parseInt(formData.purchaseOrderId) : undefined,
        goodsReceiptId: formData.goodsReceiptId ? parseInt(formData.goodsReceiptId) : undefined,
        supplierInvoiceNumber: formData.supplierInvoiceNumber || undefined,
        supplierInvoiceDate: formData.supplierInvoiceDate || undefined,
        notes: formData.notes || undefined,
        status: formData.status,
        propertyId: formData.propertyId ? parseInt(formData.propertyId) : undefined,
        unitId: formData.unitId ? parseInt(formData.unitId) : undefined,
        leaseId: formData.leaseId ? parseInt(formData.leaseId) : undefined,
        workOrderId: formData.workOrderId ? parseInt(formData.workOrderId) : undefined,
        deliveryAddress: formData.deliveryAddress || undefined,
        deliveryContactName: formData.deliveryContactName || undefined,
        deliveryContactPhone: formData.deliveryContactPhone || undefined,
        deliveryInstructions: formData.deliveryInstructions || undefined,
        lineItems: validatedLineItems.map(item => {
          const classification = item.tax_classification || (item.taxable === true ? 'Standard-Rated' : 'Exempt');
          const isTaxable = classification !== 'Exempt';
          const taxPercent = classification === 'Standard-Rated' || classification === 'Standard-Rated (5%)' ? taxRate : 0;
          
          return {
            item_id: parseInt(item.item_id),
            quantity: parseFloat(item.quantity),
            unit_price: parseFloat(item.unit_price),
            total: parseFloat(item.total),
            account_id: item.account_id,
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

      console.log('Submitting Purchase Invoice:', JSON.stringify(submitData, null, 2));

      if (id) {
        await purchaseInvoicesAPI.update(parseInt(id), submitData);
        toast({ title: 'Success', description: 'Purchase invoice updated successfully' });
        cacheService.invalidatePattern('/purchase-invoices');
      } else {
        const response = await purchaseInvoicesAPI.create(submitData);
        console.log('Purchase Invoice Created Response:', response);
        toast({ title: 'Success', description: 'Purchase invoice created successfully' });
        cacheService.invalidatePattern('/purchase-invoices');
      }

      navigate('/procurement', { state: { fromPurchaseInvoice: true, refresh: true } });
    } catch (error: any) {
      console.error('Purchase Invoice Save Error:', error);
      console.error('Error Response:', error.response?.data);
      console.error('Error Status:', error.response?.status);
      console.error('Full Error:', JSON.stringify(error.response?.data, null, 2));
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.response?.data?.errors?.map((e: any) => e.msg || e.message).join(', ') ||
                          error.message || 
                          'Failed to save purchase invoice';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading purchase invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/procurement')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{id ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</h1>
            <p className="text-muted-foreground">
              {id && formData.status ? `Current Status: ${formData.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : 'Create or edit a purchase invoice'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <Label>Supplier Invoice Number</Label>
                <Input
                  type="text"
                  placeholder="Invoice number from supplier"
                  value={formData.supplierInvoiceNumber}
                  onChange={(e) => setFormData({ ...formData, supplierInvoiceNumber: e.target.value })}
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
                <Label>Purchase Order (Optional)</Label>
                <Select
                  value={formData.purchaseOrderId || "none"}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setFormData({ ...formData, purchaseOrderId: '' });
                      setSelectedPO(null);
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
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id.toString()}>
                        {po.poNumber || po.po_number} - {po.vendor?.vendorName || 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Goods Receipt (Optional)</Label>
                <Select
                  value={formData.goodsReceiptId || "none"}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setFormData({ ...formData, goodsReceiptId: '' });
                      setSelectedGR(null);
                    } else {
                      setFormData({ ...formData, goodsReceiptId: value });
                      handleGRSelect(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select GRN" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {goodsReceipts.map((gr) => (
                      <SelectItem key={gr.id} value={gr.id.toString()}>
                        {gr.grNumber || gr.gr_number} - {gr.purchaseOrder?.poNumber || 'N/A'}
                      </SelectItem>
                    ))}
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
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(selectedPO || selectedGR) && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Associated Document:</div>
                {selectedPO && (
                  <div className="text-sm">PO: {selectedPO.poNumber || selectedPO.po_number} - Vendor: {selectedPO.vendor?.vendorName || 'N/A'}</div>
                )}
                {selectedGR && (
                  <div className="text-sm">GRN: {selectedGR.grNumber || selectedGR.gr_number} - PO: {selectedGR.purchaseOrder?.poNumber || 'N/A'}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real Estate Association (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property {properties.length > 0 && `(${properties.length} available)`}</Label>
                <Select 
                  value={formData.propertyId || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, propertyId: value === "none" ? "" : value, unitId: '', leaseId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={properties.length === 0 ? "Loading properties..." : "Select property (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {properties.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No properties available</div>
                    ) : (
                      properties.map((property) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                          {property.title || property.name} - {property.location || 'N/A'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select 
                  value={formData.unitId || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, unitId: value === "none" ? "" : value, leaseId: '' })}
                  disabled={!formData.propertyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.propertyId ? "Select unit (optional)" : "Select property first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id.toString()}>
                        {unit.unitNumber || unit.unit_number} - {unit.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lease</Label>
                <Select 
                  value={formData.leaseId || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, leaseId: value === "none" ? "" : value })}
                  disabled={!formData.unitId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.unitId ? "Select lease (optional)" : "Select unit first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {leases.map((lease) => (
                      <SelectItem key={lease.id} value={lease.id.toString()}>
                        {lease.leaseNumber || lease.lease_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Work Order ID</Label>
                <Input
                  type="text"
                  placeholder="Work order ID (optional)"
                  value={formData.workOrderId}
                  onChange={(e) => setFormData({ ...formData, workOrderId: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Delivery Address</Label>
              <Textarea
                placeholder="Delivery address (auto-populated from property/unit)"
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  placeholder="Contact person name"
                  value={formData.deliveryContactName}
                  onChange={(e) => setFormData({ ...formData, deliveryContactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  placeholder="Contact phone number"
                  value={formData.deliveryContactPhone}
                  onChange={(e) => setFormData({ ...formData, deliveryContactPhone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Delivery Instructions</Label>
              <Textarea
                placeholder="Special delivery instructions"
                value={formData.deliveryInstructions}
                onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
                        <Popover
                          open={openItemPopovers[index] || false}
                          onOpenChange={(open) => setOpenItemPopovers({ ...openItemPopovers, [index]: open })}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                            >
                              {item.item_id
                                ? items.find((it) => it.id.toString() === item.item_id?.toString())
                                  ? `${items.find((it) => it.id.toString() === item.item_id?.toString())?.itemCode} - ${items.find((it) => it.id.toString() === item.item_id?.toString())?.itemName}`
                                  : "Select item..."
                                : "Select item..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search items..." />
                              <CommandList>
                                <CommandEmpty>No items found.</CommandEmpty>
                                <CommandGroup>
                                  {items.map((it) => (
                                    <CommandItem
                                      key={it.id}
                                      value={`${it.itemCode} ${it.itemName}`}
                                      onSelect={() => {
                                        updateLineItem(index, 'item_id', it.id.toString());
                                        setOpenItemPopovers({ ...openItemPopovers, [index]: false });
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          item.item_id?.toString() === it.id.toString() ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {it.itemCode} - {it.itemName}
                                    </CommandItem>
                                  ))}
                                  <CommandItem
                                    value="__create_new__"
                                    onSelect={() => {
                                      setCreatingForLineItemIndex(index);
                                      setShowItemDialog(true);
                                      setOpenItemPopovers({ ...openItemPopovers, [index]: false });
                                    }}
                                    className="text-primary font-medium"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create New Item
                                  </CommandItem>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
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
                              if (item.tax_classification === 'Exempt' || !item.tax_classification) {
                                updateLineItem(index, 'tax_classification', 'Standard-Rated');
                              }
                              updateLineItem(index, 'taxable', true);
                            } else {
                              updateLineItem(index, 'tax_classification', 'Exempt');
                              updateLineItem(index, 'taxable', false);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.tax_classification || 'Standard-Rated'}
                          onValueChange={(value) => updateLineItem(index, 'tax_classification', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Tax Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Standard-Rated">Standard-Rated (5%)</SelectItem>
                            <SelectItem value="Zero-Rated">Zero-Rated (0%)</SelectItem>
                            <SelectItem value="Exempt">Exempt</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.tax_percent || (item.tax_classification === 'Standard-Rated' ? taxRate : 0)}
                          onChange={(e) => {
                            const newPercent = parseFloat(e.target.value) || 0;
                            updateLineItem(index, 'tax_percent', newPercent);
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
                      <TableCell className="font-bold">{(parseFloat(item.total || 0) + parseFloat(item.tax_amount || 0)).toFixed(2)}</TableCell>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end">
              <div className="text-right space-y-2 w-64">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{subtotal.toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span className="font-medium">{taxAmount.toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>{totalAmount.toFixed(2)} AED</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounting Entries Section - Only show if invoice is approved */}
        {formData.status === 'approved' && invoiceNumber && (
          <Card>
            <CardHeader>
              <CardTitle>Accounting Entries / Vouchers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEntries ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading accounting entries...</span>
                </div>
              ) : accountingEntries.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    {accountingEntries.length} accounting {accountingEntries.length === 1 ? 'entry' : 'entries'} posted for this invoice
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Transaction #</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountingEntries.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {entry.transactionDate ? new Date(entry.transactionDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {entry.transactionNumber || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.account?.accountName || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground">
                                {entry.account?.accountCode || ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.description || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.transactionType === 'debit' ? (
                              <span className="text-red-600">
                                {parseFloat(entry.amount || 0).toLocaleString('en-AE', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })} AED
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.transactionType === 'credit' ? (
                              <span className="text-green-600">
                                {parseFloat(entry.amount || 0).toLocaleString('en-AE', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })} AED
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">Total Debit:</div>
                      <div className="text-sm font-medium text-red-600">
                        {accountingEntries
                          .filter((e: any) => e.transactionType === 'debit')
                          .reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0)
                          .toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-sm font-medium">Total Credit:</div>
                      <div className="text-sm font-medium text-green-600">
                        {accountingEntries
                          .filter((e: any) => e.transactionType === 'credit')
                          .reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0)
                          .toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No accounting entries found for this invoice
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Additional notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/procurement')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {id ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </form>

      {/* Create New Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                value={newItemData.itemName}
                onChange={(e) => setNewItemData({ ...newItemData, itemName: e.target.value })}
                placeholder="Enter item name"
              />
              {itemErrors.itemName && (
                <p className="text-sm text-destructive">{itemErrors.itemName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Account *</Label>
              <Select
                value={newItemData.accountId}
                onValueChange={(value) => setNewItemData({ ...newItemData, accountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.accountCode} - {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {itemErrors.accountId && (
                <p className="text-sm text-destructive">{itemErrors.accountId}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newItemData.itemCategory}
                  onValueChange={(value) => setNewItemData({ ...newItemData, itemCategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit of Measure</Label>
                <Select
                  value={newItemData.unitOfMeasure}
                  onValueChange={(value) => setNewItemData({ ...newItemData, unitOfMeasure: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="sqm">Square Meters</SelectItem>
                    <SelectItem value="hrs">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newItemData.description}
                onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                placeholder="Item description (optional)"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateItem} disabled={creatingItem}>
              {creatingItem && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
