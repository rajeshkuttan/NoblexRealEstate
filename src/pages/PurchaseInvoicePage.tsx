import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { purchaseInvoicesAPI, vendorsAPI, purchaseOrdersAPI, goodsReceiptsAPI, itemsAPI, chartOfAccountsAPI, propertiesAPI, unitsAPI, leasesAPI, financialTransactionsAPI } from '@/services/api';
import { cacheService } from '@/services/cache';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Loader2, Plus, Trash2, ArrowLeft, Check, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox';

export default function PurchaseInvoicePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const isView = mode === 'view';
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
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [selectedGR, setSelectedGR] = useState<any>(null);
  const [accountingEntries, setAccountingEntries] = useState<any[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [formData, setFormData] = useState({
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
      setLineItems([{ 
        item_id: '', 
        quantity: 1, 
        unit_price: 0, 
        total: 0, 
        taxable: true, 
        tax_percent: taxRate, 
        tax_classification: 'Standard-Rated', 
        tax_amount: 0,
        discount_percent: 0,
        discount_amount: 0
      }]);
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

  // Enrich line items with details from master items list when available
  useEffect(() => {
    if (items.length > 0 && lineItems.length > 0) {
      setLineItems(prevItems => {
        let hasChanges = false;
        const newItems = prevItems.map(li => {
          if ((!li.itemName || li.itemName === 'Unknown Item') && li.item_id) {
            const matchedItem = items.find(i => i.id.toString() === li.item_id.toString());
            if (matchedItem) {
              hasChanges = true;
              return { 
                ...li, 
                itemName: matchedItem.itemName, 
                itemCode: matchedItem.itemCode 
              };
            }
          }
          return li;
        });
        return hasChanges ? newItems : prevItems;
      });
    }
  }, [items, lineItems.length]);

  // Enrich line items with GRN Number from linked Goods Receipts if missing
  useEffect(() => {
    const fetchLinkedGRNs = async () => {
      // Only proceed if we have valid GR IDs and line items that need GRN numbers
      if (formData.goodsReceiptIds && formData.goodsReceiptIds.length > 0 && lineItems.length > 0) {
        
        // check if any line item is missing grNumber or has it as empty string
        const needsUpdate = lineItems.some(li => !li.grNumber || li.grNumber === '');
        if (!needsUpdate) return;

        try {
          const grDetails: any[] = [];
          for (const grId of formData.goodsReceiptIds) {
             // Check if we already have this GR in state to avoid extra API calls
             const existing = goodsReceipts.find(g => g.id.toString() === grId.toString());
             if (existing && existing.grNumber) {
                grDetails.push(existing);
             } else {
                // Fetch from API
                try {
                  const response = await goodsReceiptsAPI.getById(parseInt(grId));
                  const gr = response.data?.data?.goodsReceipt || response.data;
                  if (gr) grDetails.push(gr);
                } catch (err) {
                  console.error(`Failed to fetch GR ${grId}`, err);
                }
             }
          }

          if (grDetails.length > 0) {
            // Create a pool of available items from GRs to match against line items
            // Structure: { grNumber: string, itemIds: string[] }
            const grItemPool = grDetails.map(gr => {
              let grItems = gr.lineItems || [];
              if (typeof grItems === 'string') {
                try { grItems = JSON.parse(grItems); } catch(e) { grItems = []; }
              }
              return {
                grNumber: gr.grNumber || gr.gr_number,
                grId: gr.id,
                // store available quantity or just count? For now just list of item IDs is enough to distinguish
                // assuming 1 line per item per GR. 
                itemIds: Array.isArray(grItems) ? grItems.map((i: any) => i.item_id?.toString()) : []
              };
            });

            setLineItems(prevItems => {
              // We need to clone the pool for each iteration if we were strictly pure, 
              // but here we want to consume from the pool across the map.
              // So we 'mutate' the pool counts as we go.
              const currentPool = grItemPool.map(p => ({ ...p, itemIds: [...p.itemIds] }));

              return prevItems.map(li => {
                // If GR number is already present, keep it
                if (li.grNumber) return li;

                const itemId = li.item_id?.toString();
                if (!itemId) return li;

                // Find a GR in the pool that has this item
                const poolIndex = currentPool.findIndex(p => p.itemIds.includes(itemId));

                if (poolIndex !== -1) {
                   const matchedGR = currentPool[poolIndex];
                   // Remove one instance of this item from the pool so next invoice line gets the next GR
                   // This handles the case where GR1 has Item A and GR2 has Item A.
                   const itemIndex = matchedGR.itemIds.indexOf(itemId);
                   if (itemIndex !== -1) {
                     matchedGR.itemIds.splice(itemIndex, 1);
                   }
                   
                   return { ...li, grNumber: matchedGR.grNumber };
                }
                
                // Fallback: If there's only one GRN linked, assign it to that
                if (grDetails.length === 1) {
                   return { ...li, grNumber: grDetails[0].grNumber || grDetails[0].gr_number };
                }

                return li;
              });
            });
          }
        } catch (error) {
          console.error('Error fetching linked GRNs:', error);
        }
      }
    };

    fetchLinkedGRNs();
  }, [formData.goodsReceiptIds, lineItems.length]); // Dependencies: run when GR IDs change or line items are loaded

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
        navigate('/procurement?tab=purchase-invoices');
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

      // Parse goodsReceiptIds if it's a string
      let goodsReceiptIdsData = pi.goodsReceiptIds || [];
      if (typeof goodsReceiptIdsData === 'string') {
        try {
          goodsReceiptIdsData = JSON.parse(goodsReceiptIdsData);
        } catch (e) {
          console.error('Failed to parse goodsReceiptIds:', e);
          goodsReceiptIdsData = [];
        }
      }
      
      // Ensure it is an array of strings
      if (Array.isArray(goodsReceiptIdsData)) {
          goodsReceiptIdsData = goodsReceiptIdsData.map((id: any) => id.toString());
      } else {
           goodsReceiptIdsData = [];
      }

      setFormData({
        vendorId: pi.vendorId?.toString() || pi.vendor_id?.toString() || '',
        purchaseOrderId: pi.purchaseOrderId?.toString() || pi.purchase_order_id?.toString() || '',
        goodsReceiptId: pi.goodsReceiptId?.toString() || pi.goods_receipt_id?.toString() || '',
        goodsReceiptIds: goodsReceiptIdsData.length > 0 ? goodsReceiptIdsData : (pi.goodsReceiptId ? [pi.goodsReceiptId.toString()] : []),
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
        discountType: pi.discountType || 'amount',
        discountValue: pi.discountValue || 0,
      });

      // Set line items with tax fields
      const itemsWithTax = lineItemsData.map((item: any) => ({
        item_id: item.item_id?.toString() || '',
        grNumber: item.grNumber || '',
        itemName: item.itemName || 'Unknown Item',
        itemCode: item.itemCode || '',
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total: item.total || 0,
        account_id: item.account_id,
        taxable: item.taxable !== false,
        tax_percent: item.tax_percent || (item.taxable !== false ? taxRate : 0),
        tax_classification: item.tax_classification || (item.taxable !== false ? 'Standard-Rated' : 'Exempt'),

        tax_amount: item.tax_amount || 0,
        discount_percent: item.discount_percent || 0,
        discount_amount: item.discount_amount || 0,
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
      navigate('/procurement?tab=purchase-invoices');
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
      const sortedVendors = (response.data?.data?.vendors || []).sort((a: any, b: any) => 
        a.vendorName.localeCompare(b.vendorName)
      );
      setVendors(sortedVendors);
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

  const fetchPOs = async (vendorId?: string) => {
    try {
      const params: any = { limit: 100, status: 'sent,acknowledged,partially_received,fully_received' };
      if (vendorId) params.vendorId = vendorId;
      
      const response = await purchaseOrdersAPI.getAll(params);
      const pos = response.data?.data?.purchaseOrders || response.data?.data || [];
      const sortedPOs = (Array.isArray(pos) ? pos : []).sort((a: any, b: any) => 
        (a.poNumber || '').localeCompare(b.poNumber || '')
      );
      setPurchaseOrders(sortedPOs);
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  const fetchGRs = async (poId?: string) => {
    try {
      let response;
      if (poId) {
        response = await goodsReceiptsAPI.getByPO(parseInt(poId));
      } else {
        response = await goodsReceiptsAPI.getAll({ limit: 100 });
      }
      
      const grsData = response.data?.data?.goodsReceipts || response.data?.goodsReceipts || response.data || [];
      const grs = Array.isArray(grsData) ? grsData : [grsData];
      const sortedGRs = grs.sort((a: any, b: any) => (a.grNumber || '').localeCompare(b.grNumber || ''));
      setGoodsReceipts(sortedGRs);
    } catch (error) {
      console.error('Failed to fetch goods receipts:', error);
      setGoodsReceipts([]);
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

  const handleVendorChange = (vendorId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      vendorId, 
      purchaseOrderId: '', 
      goodsReceiptId: '',
      goodsReceiptIds: [] 
    }));
    setPurchaseOrders([]);
    setGoodsReceipts([]);
    setSelectedPO(null);
    setSelectedGR(null);
    setLineItems([]); // Clear line items when vendor changes
    
    if (vendorId) {
      fetchPOs(vendorId);
    }
  };

  const handlePOChange = async (poId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      purchaseOrderId: poId, 
      goodsReceiptId: '',
      goodsReceiptIds: [] 
    }));
    setGoodsReceipts([]);
    setSelectedGR(null);
    setLineItems([]); // Clear line items when PO changes
    
    if (poId) {
      // Fetch PO details to set selectedPO and potentially other fields
      try {
        const response = await purchaseOrdersAPI.getById(parseInt(poId));
        const po = response.data?.data?.purchaseOrder || response.data?.data;
        if (po) {
          setSelectedPO(po);
          // Auto-populate delivery info from PO
          setFormData(prev => ({
            ...prev,
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
      
      fetchGRs(poId);
    } else {
      setSelectedPO(null);
    }
  };

  const handleGRChange = async (grIds: string[]) => {
    setFormData(prev => ({ ...prev, goodsReceiptIds: grIds }));
    
    if (grIds.length === 0) {
      setLineItems([]);
      setSelectedGR(null);
      return;
    }

    try {
      const newItems: any[] = [];
      // Fetch details for all selected GRs
      for (const grId of grIds) {
        // Find GR in local state if possible
        const existingGR = goodsReceipts.find(g => g.id.toString() === grId);
        
        // Always fetch by ID to ensure we have line items
        const response = await goodsReceiptsAPI.getById(parseInt(grId));
        const gr = response.data?.data?.goodsReceipt || response.data;
        
        if (gr) {
          // Set selectedGR to the first one just for display purposes
          if (grIds[0] === grId) setSelectedGR(gr);

          if (gr.lineItems) {
            let grLineItems = gr.lineItems;
            if (typeof grLineItems === 'string') {
              try {
                grLineItems = JSON.parse(grLineItems);
              } catch (e) { console.error('Error parsing GR items', e); grLineItems = []; }
            }

            grLineItems.forEach((item: any) => {
              // Calculate subtotal
              const quantity = item.received_qty || item.quantity || 0;
              const unitPrice = item.unit_price || 0;
              const subtotal = quantity * unitPrice;

              // Tax logic
              const taxClassification = item.tax_classification || (item.taxable === false ? 'Exempt' : 'Standard-Rated');
              const isTaxable = taxClassification !== 'Exempt';
              let taxPercent = 0;
              let taxAmount = 0;
              
              if (taxClassification === 'Standard-Rated' || taxClassification === 'Standard-Rated (5%)') {
                taxPercent = item.tax_percent || taxRate;
                taxAmount = item.tax_amount || (subtotal * taxPercent) / 100;
              }

               // Ensure account_id is set - get from items list if not in GRN line item
              let accountId = item.account_id;
              if (!accountId) {
                const itemRecord = items.find(i => i.id.toString() === item.item_id?.toString());
                if (itemRecord && itemRecord.accountId) {
                  accountId = itemRecord.accountId;
                }
              }

              newItems.push({
                item_id: item.item_id?.toString() || '',
                itemName: item.item?.itemName || 'Unknown Item',
                itemCode: item.item?.itemCode || '',
                grNumber: gr.grNumber || gr.gr_number || '', // Add GR Number
                quantity: quantity,
                unit_price: unitPrice,
                total: subtotal,
                account_id: accountId,
                taxable: isTaxable,
                tax_percent: taxPercent,
                tax_classification: taxClassification,

                tax_amount: taxAmount,
                discount_percent: 0,
                discount_amount: 0
              });
            });
          }
        }
      }
      setLineItems(newItems);
      
      // Update delivery info based on first GR
      if (grIds.length > 0) {
         const response = await goodsReceiptsAPI.getById(parseInt(grIds[0]));
         const gr = response.data?.data?.goodsReceipt || response.data;
         if (gr) {
            setFormData(prev => ({
              ...prev,
              propertyId: gr.deliveryPropertyId?.toString() || gr.delivery_property_id?.toString() || prev.propertyId,
              unitId: gr.deliveryUnitId?.toString() || gr.delivery_unit_id?.toString() || prev.unitId,
              deliveryAddress: gr.deliveryAddress || gr.delivery_address || prev.deliveryAddress,
              deliveryContactName: gr.deliveryContactName || gr.delivery_contact_name || prev.deliveryContactName,
              deliveryContactPhone: gr.deliveryContactPhone || gr.delivery_contact_phone || prev.deliveryContactPhone,
              deliveryInstructions: gr.deliveryNotes || gr.delivery_notes || prev.deliveryInstructions,
            }));
         }
      }

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
    


    // Handle Discount Logic
    if (field === 'discount_percent') {
      const quantity = updated[index].quantity || 0;
      const unitPrice = updated[index].unit_price || 0;
      const grossAmount = quantity * unitPrice;
      const discountPercent = parseFloat(value) || 0;
      const discountAmount = (grossAmount * discountPercent) / 100;
      
      updated[index].discount_percent = discountPercent;
      updated[index].discount_amount = discountAmount;
    }

    if (field === 'discount_amount') {
      const quantity = updated[index].quantity || 0;
      const unitPrice = updated[index].unit_price || 0;
      const grossAmount = quantity * unitPrice;
      const discountAmount = parseFloat(value) || 0;
      
      updated[index].discount_amount = discountAmount;
      // Calculate percent, ensure no division by zero
      updated[index].discount_percent = grossAmount > 0 ? (discountAmount / grossAmount) * 100 : 0;
    }

    // Recalculate everything if any relevant field changes
    if (['quantity', 'unit_price', 'taxable', 'tax_percent', 'tax_classification', 'discount_percent', 'discount_amount'].includes(field)) {
      const quantity = updated[index].quantity || 0;
      const unitPrice = updated[index].unit_price || 0;
      const grossAmount = quantity * unitPrice;
      const discountAmount = updated[index].discount_amount || 0;
      const taxableAmount = Math.max(0, grossAmount - discountAmount);
      
      // Calculate tax based on classification
      const classification = updated[index].tax_classification;
      let taxAmount = 0;
      
      if (classification === 'Standard-Rated' || classification === 'Standard-Rated (5%)') {
        updated[index].tax_percent = taxRate; // Reset to default if standard
        taxAmount = (taxableAmount * taxRate) / 100;
      } else if (classification === 'Zero-Rated' || classification === 'Zero-Rated (0%)' || classification === 'Exempt') {
        taxAmount = 0;
        updated[index].tax_percent = 0;
      } else {
         // Custom percent
         const itemTaxPercent = updated[index].taxable ? (updated[index].tax_percent || taxRate) : 0;
         taxAmount = (taxableAmount * itemTaxPercent) / 100;
      }
      
      updated[index].tax_amount = taxAmount;
      // Total = Taxable Amount + Tax Amount (Logic: Customer pays the discounted price + tax on that price)
      updated[index].total = taxableAmount; // Note: 'total' usually implies line total excluding tax in some systems, or including? 
      // Checking `calculateTotals`: `subtotal = sum(item.total)`. `totalAmount = subtotal + taxAmount`.
      // So `item.total` should be the pre-tax amount (Taxable Amount).
      // LET'S CONFIRM EXISTING LOGIC:
      // previously: subtotal = quantity * unitPrice. item.total = subtotal.
      // So item.total is PRE-TAX.
      
      updated[index].total = taxableAmount;
    }
        // Recalculate total and tax when quantity, unit_price, taxable, tax_percent, or tax_classification changes
    if (['quantity', 'unit_price', 'taxable', 'tax_percent', 'tax_classification'].includes(field)) {
      const quantity = updated[index].quantity || 0;
      const unitPrice = updated[index].unit_price || 0;
      const grossAmount = quantity * unitPrice; // Gross is effectively taxable base before global discount proration in UI
      // Note: In UI line items, we simply show the GROSS amounts.
      // The Global Discount is applied at Summary level.
      // So item.total here remains Gross Amount (or whatever visual we want).
      // Let's keep item.total as Gross Amount for the Line Item table to avoid confusion, 
      // OR should it match the "Taxable" column? 
      // The "Taxable" column in table usually implies "Amount on which tax is calculated".
      // If we display Gross there, but tax is calculated on Net, it's confusing.
      // BUT, since discount is global, showing Net per line item might be overkill/complex.
      // Let's stick to standard behavior: Line Item shows Gross. Summary shows Discount.
      
      updated[index].total = grossAmount;
      
       // Calculate tax based on classification (on GROSS for now in table View? Or approximate?)
       // Actually, taxAmount in the table will be misleading if it doesn't account for global discount.
       // But updating line item tax dynamically based on a global field (which is outside this function scope essentially)
       // requires `calculateTotals` to drive the derived values.
       // The `calculateTotals` function I wrote DOES iterate and calculate tax.
       // So `updateLineItem` should essentially just update the raw values, 
       // and `calculateTotals` (called in render or useEffect) determines the final tax.
       // However, `lineItems` state stores `tax_amount`.
       // We should trigger a global recalculation whenever line items change.
       
      const classification = updated[index].tax_classification;
      if (classification === 'Standard-Rated' || classification === 'Standard-Rated (5%)') {
        updated[index].tax_percent = taxRate;
      } else if (classification === 'Zero-Rated' || classification === 'Zero-Rated (0%)' || classification === 'Exempt') {
        updated[index].tax_percent = 0;
      } else {
        const isTaxable = updated[index].taxable !== false;
        updated[index].tax_percent = isTaxable ? (parseFloat(updated[index].tax_percent) || taxRate) : 0;
      }
      
      // We don't calculate tax_amount here because it depends on Global Discount.
      // It will be calculated in the render/summary or we need to update state globally.
      // Better: let `calculateTotals` return the detailed tax breakdown if needed, 
      // OR just update the UI to use `calculateTotals` for the Summary, 
      // and maybe leave line item table showing "Estimated Tax" or "Gross Tax"? 
      // The user wants "recalculate tax after discount".
      // So the Tax column SHOULD show the reduced tax.
      // This means `lineItems` state needs to be updated with the correct tax_amount.
      
      // THIS IS TRICKY: `updateLineItem` updates one item. Global Discount is in `formData`.
      // If `updateLineItem` runs, it updates state.
      // Does `calculateTotals` update `lineItems` state? No, it returns totals.
      // We should probably invoke a "recalculateAll" function that updates `lineItems` state with correct tax/totals.
      
      // For now, let's just set basic values here.
    }
    
    setLineItems(updated);
  };

  // Calculate derived values for render
  const rawSubtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)), 0);
  
  let globalDiscountAmount = 0;
  const discountVal = parseFloat(formData.discountValue) || 0;
  if (formData.discountType === 'percentage') {
    globalDiscountAmount = (rawSubtotal * discountVal) / 100;
  } else {
    globalDiscountAmount = discountVal;
  }
  globalDiscountAmount = Math.min(globalDiscountAmount, rawSubtotal);

  const derivedLineItems = lineItems.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const itemGross = qty * price;
    
    // Weight based on gross amount
    const weight = rawSubtotal > 0 ? (itemGross / rawSubtotal) : 0;
    const itemDiscount = globalDiscountAmount * weight;
    const itemTaxable = Math.max(0, itemGross - itemDiscount);
    
    const classification = item.tax_classification || 'Standard-Rated';
    let itemTaxPercent = 0;
    
     if (classification === 'Standard-Rated' || classification === 'Standard-Rated (5%)') {
        itemTaxPercent = parseFloat(item.tax_percent) || 5;
      } else if (classification === 'Zero-Rated' || classification === 'Zero-Rated (0%)' || classification === 'Exempt') {
        itemTaxPercent = 0;
      } else {
         const isTaxable = item.taxable !== false;
         itemTaxPercent = isTaxable ? (parseFloat(item.tax_percent) || 5) : 0;
      }
      
    const itemTax = (itemTaxable * itemTaxPercent) / 100;
    
    return {
      ...item,
      grossTotal: itemGross,
      discountAmount: itemDiscount,
      taxableAmount: itemTaxable,
      taxAmount: itemTax,
      netTotal: itemTaxable + itemTax
    };
  });

  const summaryTaxAmount = derivedLineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const summaryTotalAmount = rawSubtotal - globalDiscountAmount + summaryTaxAmount;

  // We don't need a separate calculateTotals function anymore, 
  // but if other parts key off 'calculateTotals' return, we can shim it or remove usages.
  // The 'calculateTotals' was used in handleSubmit? No, handleSubmit calls API.
  // It was used in render.


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

    if (!formData.purchaseOrderId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a purchase order',
        variant: 'destructive',
      });
      return;
    }

    if (formData.goodsReceiptIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one goods receipt',
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
      // Use derived values
      const subtotal = rawSubtotal;
      const taxAmount = summaryTaxAmount;
      const totalAmount = summaryTotalAmount;

      const submitData = {
        vendorId: parseInt(formData.vendorId),
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        purchaseOrderId: formData.purchaseOrderId ? parseInt(formData.purchaseOrderId) : undefined,
        goodsReceiptId: formData.goodsReceiptIds.length > 0 ? parseInt(formData.goodsReceiptIds[0]) : undefined, // Backward compatibility
        goodsReceiptIds: formData.goodsReceiptIds,
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
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue?.toString() || '0'),
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

      navigate('/procurement?tab=purchase-invoices', { state: { fromPurchaseInvoice: true, refresh: true } });
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

  const addItem = () => {
    setLineItems([
      ...lineItems,
      {
        item_id: '',
        quantity: 1,
        unit_price: 0,
        total: 0,
        taxable: true,
        tax_percent: taxRate,
        tax_classification: 'Standard-Rated',
        tax_amount: 0,
        grNumber: ''
      }
    ]);
  };

  const removeItem = (index: number) => {
    const updated = [...lineItems];
    updated.splice(index, 1);
    setLineItems(updated);
  };



  const vendorOptions = vendors.map(v => ({ value: v.id.toString(), label: v.vendorName }));
  const poOptions = purchaseOrders.map(po => ({ value: po.id.toString(), label: po.poNumber }));
  const grOptions = goodsReceipts.map(gr => ({ value: gr.id.toString(), label: `${gr.grNumber} (${gr.receiptDate})` }));
  const itemOptions = items.map(item => ({ value: item.id.toString(), label: `${item.itemCode ? item.itemCode + ' - ' : ''}${item.itemName}` }));

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading purchase invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 uiux-page-enter">
      <div className="uiux-page-header items-center">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/procurement?tab=purchase-invoices')} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="uiux-page-title">{id ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</h1>
            <p className="uiux-page-subtitle">
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
                <Combobox
                  options={vendorOptions}
                  value={formData.vendorId}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, vendorId: value, purchaseOrderId: '', goodsReceiptId: '', goodsReceiptIds: [] }));
                    setPurchaseOrders([]);
                    setGoodsReceipts([]);
                    setLineItems([]);
                  }}
                  placeholder="Select vendor"
                  searchPlaceholder="Search vendor..."
                  disabled={!!id || isView}
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Date *</Label>
                <Input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  disabled={isView}
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier Invoice Number</Label>
                <Input
                  type="text"
                  id="supplierInvoiceNumber"
                  placeholder="Enter supplier invoice number"
                  value={formData.supplierInvoiceNumber}
                  onChange={(e) => setFormData({ ...formData, supplierInvoiceNumber: e.target.value })}
                  disabled={isView}
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier Invoice Date</Label>
                <Input
                  id="supplierInvoiceDate"
                  type="date"
                  value={formData.supplierInvoiceDate}
                  onChange={(e) => setFormData({ ...formData, supplierInvoiceDate: e.target.value })}
                  disabled={isView}
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
                  disabled={!formData.vendorId || isView}
                />
              </div>
              <div className="space-y-2">
                <Label>Goods Receipts *</Label>
                <MultiSelectCombobox
                  options={grOptions}
                  value={formData.goodsReceiptIds}
                  onChange={handleGRChange}
                  placeholder="Select GRNs"
                  searchPlaceholder="Search GRN..."
                  disabled={!formData.purchaseOrderId || isView}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                  disabled={isView}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <SearchableSelect
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  disabled={isView}
                  placeholder="Select status"
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
                <SearchableSelect
                  value={formData.propertyId || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, propertyId: value === "none" ? "" : value, unitId: '', leaseId: '' })}
                  disabled={isView}
                  placeholder={properties.length === 0 ? "Loading properties..." : "Select property (optional)"}
                  searchPlaceholder="Search properties..."
                  emptyMessage="No properties available"
                  options={[
                    { value: 'none', label: 'None' },
                    ...properties.map((property) => ({
                      value: property.id.toString(),
                      label: `${property.title || property.name} - ${property.location || 'N/A'}`,
                    })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <SearchableSelect
                  value={formData.unitId || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, unitId: value === "none" ? "" : value, leaseId: '' })}
                  disabled={!formData.propertyId || isView}
                  placeholder={formData.propertyId ? "Select unit (optional)" : "Select property first"}
                  searchPlaceholder="Search units..."
                  emptyMessage="No units found"
                  options={[
                    { value: 'none', label: 'None' },
                    ...units.map((unit) => ({
                      value: unit.id.toString(),
                      label: `${unit.unitNumber || unit.unit_number} - ${unit.type}`,
                    })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Lease</Label>
                <SearchableSelect
                  value={formData.leaseId || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, leaseId: value === "none" ? "" : value })}
                  disabled={!formData.unitId || isView}
                  placeholder={formData.unitId ? "Select lease (optional)" : "Select unit first"}
                  searchPlaceholder="Search leases..."
                  emptyMessage="No leases found"
                  options={[
                    { value: 'none', label: 'None' },
                    ...leases.map((lease) => ({
                      value: lease.id.toString(),
                      label: lease.leaseNumber || lease.lease_number,
                    })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Work Order ID</Label>
                <Input
                  type="text"
                  placeholder="Work order ID (optional)"
                  value={formData.workOrderId}
                  onChange={(e) => setFormData({ ...formData, workOrderId: e.target.value })}
                  disabled={isView}
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
                disabled={isView}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  placeholder="Contact person name"
                  value={formData.deliveryContactName}
                  onChange={(e) => setFormData({ ...formData, deliveryContactName: e.target.value })}
                  disabled={isView}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  placeholder="Contact phone number"
                  value={formData.deliveryContactPhone}
                  onChange={(e) => setFormData({ ...formData, deliveryContactPhone: e.target.value })}
                  disabled={isView}
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
                disabled={isView}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              {!isView && (
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Item</TableHead>
                    <TableHead className="w-[100px]">Quantity</TableHead>
                    <TableHead className="w-[120px]">Unit Price</TableHead>
                    <TableHead className="w-[120px]">Subtotal</TableHead>
                    <TableHead className="w-[80px]">Taxable</TableHead>
                    <TableHead className="w-[150px]">Tax Type</TableHead>
                    <TableHead className="w-[80px]">Tax %</TableHead>
                    <TableHead className="w-[100px]">Tax Amount</TableHead>
                    <TableHead className="w-[120px]">Total</TableHead>
                    {!isView && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isView ? 9 : 10} className="text-center text-muted-foreground">
                        No items added. Click "Add Item" to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    derivedLineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                           {isView ? (
                             <div className="flex flex-col">
                               <span>{item.itemName}</span>
                               <span className="text-xs text-muted-foreground">{item.itemCode}</span>
                               {item.grNumber && <span className="text-xs text-blue-600">GRN: {item.grNumber}</span>}
                             </div>
                           ) : (
                            <div className="flex flex-col gap-1">
                              <Combobox
                                options={itemOptions}
                                value={item.item_id?.toString()}
                                onChange={(value) => updateLineItem(index, 'item_id', value)}
                                placeholder="Select item"
                                searchPlaceholder="Search item..."
                              />
                               {item.grNumber && <span className="text-xs text-blue-600">GRN: {item.grNumber}</span>}
                            </div>
                           )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="1"
                            disabled={isView || !!item.grNumber} // Disable quantity if derived from GRN? User requested Add Item, so maybe editing is allowed for manual items. GRN items should ideally be fixed qty? Sticking to previous request of derived items being read-only qty, but enabling for manual.
                            // Actually, let's allow editing quantity for all, but maybe show a warning if it differs from GRN? For now, unlock it if it's what they want, but safeguard GRN matching? 
                            // Re-reading: "removed the add item concept... but in create not add". 
                            // If I strictly follow "from GRN", I should disable. If I allow "Add Item", those are manual.
                            // For GRN items, I'll keep quantity disabled to match the "strict usage". For manual items (no GR Number), enable it.
                            // Wait, if item has grNumber, it's from GRN.
                            // So: disabled={isView || !!item.grNumber}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            disabled={isView}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                            {(item.quantity * item.unit_price).toFixed(2)}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <Checkbox
                            checked={item.taxable}
                            onCheckedChange={(checked) => updateLineItem(index, 'taxable', checked)}
                            disabled={isView}
                          />
                        </TableCell>
                         <TableCell>
                          <SearchableSelect
                            value={item.tax_classification}
                            onValueChange={(value) => updateLineItem(index, 'tax_classification', value)}
                            disabled={isView || !item.taxable}
                            placeholder="Tax type"
                            searchPlaceholder="Search tax types..."
                            emptyMessage="No tax types found"
                            className="w-full"
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
                            value={item.tax_percent}
                            onChange={(e) => updateLineItem(index, 'tax_percent', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.01"
                            disabled={isView || !item.taxable || (item.tax_classification !== 'Standard-Rated' && item.tax_classification !== 'Standard-Rated (5%)')}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background">
                            {item.taxAmount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold">{item.netTotal.toFixed(2)}</TableCell>
                         {!isView && (
                          <TableCell>
                             {/* Only allow deleting if not from GRN? Or allow deleting but it might come back if GRN selected? 
                                User complained about "removed delete button". So I should add it back. 
                                But if I delete a GRN item, does it deselect the GRN? No. 
                                It's just a line item. 
                             */}
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeItem(index)}
                              className="text-destructive hover:text-destructive/90"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
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
              <div className="text-right space-y-4 w-80">
                <div className="flex justify-between items-center">
                  <span>Subtotal:</span>
                  <span className="font-medium">{rawSubtotal.toFixed(2)} AED</span>
                </div>
                
                <div className="flex justify-between items-center gap-2">
                  <SearchableSelect
                    value={formData.discountType || 'amount'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, discountType: value }))}
                    disabled={isView || formData.status === 'approved' || formData.status === 'paid'}
                    placeholder="Type"
                    searchPlaceholder="Search discount types..."
                    emptyMessage="No discount types found"
                    className="w-[130px] h-8 text-xs"
                    options={[
                      { value: 'amount', label: 'Amount' },
                      { value: 'percentage', label: 'Percent %' },
                    ]}
                  />
                  <Input
                    type="number" 
                    className="h-8 w-24 text-right"
                    placeholder="0.00"
                    value={formData.discountValue || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                    disabled={isView || formData.status === 'approved' || formData.status === 'paid'}
                  />
                  <div className="w-20 text-right text-red-500 text-sm">
                    - {globalDiscountAmount.toFixed(2)}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span>Tax:</span>
                  <span className="font-medium">{summaryTaxAmount.toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>{summaryTotalAmount.toFixed(2)} AED</span>
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
              disabled={isView}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/procurement?tab=purchase-invoices')}>
            {isView ? 'Back' : 'Cancel'}
          </Button>
          {!isView && (
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {id ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          )}
        </div>
      </form>

      {/* Create New Item Dialog */}
    </div>
  );
}
