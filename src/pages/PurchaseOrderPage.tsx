import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrdersAPI, vendorsAPI, itemsAPI, chartOfAccountsAPI, propertiesAPI, unitsAPI, leasesAPI } from '@/services/api';
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

export default function PurchaseOrderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
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
  const [formData, setFormData] = useState({
    vendorId: '',
    poDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    notes: '',
    status: 'sent',
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
    if (id) {
      fetchPurchaseOrder();
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

  const fetchPurchaseOrder = async () => {
    try {
      setFetching(true);
      const response = await purchaseOrdersAPI.getById(parseInt(id!));
      // API returns { success: true, data: { purchaseOrder: {...} } }
      const po = response.data?.data?.purchaseOrder || response.data?.data;
      
      if (!po) {
        toast({
          title: 'Error',
          description: 'Purchase order not found',
          variant: 'destructive',
        });
        navigate('/procurement?tab=purchase-orders');
        return;
      }

      console.log('Fetched PO:', po); // Debug log

      setFormData({
        vendorId: po.vendorId?.toString() || po.vendor_id?.toString() || '',
        poDate: po.poDate ? new Date(po.poDate).toISOString().split('T')[0] : (po.po_date ? new Date(po.po_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        expectedDeliveryDate: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0] : (po.expected_delivery_date ? new Date(po.expected_delivery_date).toISOString().split('T')[0] : ''),
        notes: po.notes || '',
        status: po.status || 'draft',
        propertyId: po.propertyId?.toString() || po.property_id?.toString() || '',
        unitId: po.unitId?.toString() || po.unit_id?.toString() || '',
        leaseId: po.leaseId?.toString() || po.lease_id?.toString() || '',
        workOrderId: po.workOrderId?.toString() || po.work_order_id?.toString() || '',
        deliveryAddress: po.deliveryAddress || po.delivery_address || '',
        deliveryContactName: po.deliveryContactName || po.delivery_contact_name || '',
        deliveryContactPhone: po.deliveryContactPhone || po.delivery_contact_phone || '',
        deliveryInstructions: po.deliveryInstructions || po.delivery_instructions || '',
      });

      // Fetch units and leases if property/unit is set
      if (po.propertyId || po.property_id) {
        await fetchUnits(parseInt(po.propertyId || po.property_id));
      }
      if (po.unitId || po.unit_id) {
        await fetchLeases(parseInt(po.unitId || po.unit_id));
      }

      // Initialize line items with tax fields, defaulting to taxable if not specified
      const lineItemsData = po.lineItems || po.line_items || [];
      const itemsWithTax = lineItemsData.map((item: any) => {
        // Migrate old tax_classification values to UAE FTA standards
        let classification = item.tax_classification || '';
        if (classification === 'VAT' || classification === '') {
          classification = item.taxable !== false ? 'Standard-Rated' : 'Exempt';
        }
        
        return {
          item_id: item.item_id || item.itemId || '',
          quantity: item.quantity || 0,
          unit_price: item.unit_price || item.unitPrice || 0,
          total: item.total || 0,
          taxable: item.taxable !== false, // Default to true
          tax_percent: item.tax_percent || item.taxPercent || (item.taxable !== false ? taxRate : 0),
          tax_classification: classification,
          tax_amount: item.tax_amount || item.taxAmount || 0,
        };
      });
      
      setLineItems(itemsWithTax.length > 0 ? itemsWithTax : [{ item_id: '', quantity: 1, unit_price: 0, total: 0, taxable: true, tax_percent: taxRate, tax_classification: 'Standard-Rated', tax_amount: 0 }]);
    } catch (error: any) {
      console.error('Error fetching purchase order:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch purchase order',
        variant: 'destructive',
      });
      navigate('/procurement?tab=purchase-orders');
    } finally {
      setFetching(false);
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
      const response = await itemsAPI.getAll({ limit: 500, isActive: true });
      setItems(response.data?.data?.items || []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await chartOfAccountsAPI.getAll({ 
        accountTypes: 'expense,asset',
        limit: 500 
      });
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
      console.log('🔵 Fetching properties...');
      // Backend has max limit of 100, so use that instead of 500
      const response = await propertiesAPI.getAll({ page: 1, limit: 100 });
      console.log('📥 Full API response:', JSON.stringify(response, null, 2));
      
      // Match the exact pattern from PurchaseOrderList.tsx which works
      const propertiesData = response.data?.properties || [];
      
      console.log('📊 Extracted properties:', propertiesData);
      console.log('📊 Properties count:', propertiesData.length);
      console.log('📊 Properties type:', typeof propertiesData);
      console.log('📊 Is array?', Array.isArray(propertiesData));
      
      if (Array.isArray(propertiesData) && propertiesData.length > 0) {
        console.log('✅ First property:', propertiesData[0]);
        console.log('✅ Property keys:', Object.keys(propertiesData[0]));
      } else {
        console.warn('⚠️ No properties found or not an array');
      }
      
      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      console.log('✅ Properties state set, count:', Array.isArray(propertiesData) ? propertiesData.length : 0);
    } catch (error) {
      console.error('❌ Failed to fetch properties:', error);
      console.error('❌ Error details:', error);
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
        status: formData.status,
        propertyId: formData.propertyId ? parseInt(formData.propertyId) : undefined,
        unitId: formData.unitId ? parseInt(formData.unitId) : undefined,
        leaseId: formData.leaseId ? parseInt(formData.leaseId) : undefined,
        workOrderId: formData.workOrderId ? parseInt(formData.workOrderId) : undefined,
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

      if (id) {
        await purchaseOrdersAPI.update(parseInt(id), submitData);
        toast({ title: 'Success', description: 'Purchase order updated successfully' });
        // Clear cache for purchase orders list to force refresh
        cacheService.invalidatePattern('/purchase-orders');
      } else {
        await purchaseOrdersAPI.create(submitData);
        toast({ title: 'Success', description: 'Purchase order created successfully' });
        // Clear cache for purchase orders list to force refresh
        cacheService.invalidatePattern('/purchase-orders');
      }

      navigate('/procurement?tab=purchase-orders', { state: { fromPurchaseOrder: true, refresh: true } });
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

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/procurement?tab=purchase-orders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{id ? 'Edit Purchase Order' : 'New Purchase Order'}</h1>
            <p className="text-muted-foreground">
              {id && formData.status ? `Current Status: ${formData.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}` : 'Create or edit a purchase order'}
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
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="partially_received">Partially Received</SelectItem>
                    <SelectItem value="fully_received">Fully Received</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                  type="number"
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
                rows={3}
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                        >
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
                  <Label>Subtotal:</Label>
                  <span className="font-medium">{subtotal.toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between">
                  <Label>Total Tax:</Label>
                  <span className="font-medium">{taxAmount.toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <Label>Total Amount:</Label>
                  <span>{totalAmount.toFixed(2)} AED</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Add any additional notes or comments..."
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/procurement')} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {id ? 'Update Purchase Order' : 'Create Purchase Order'}
          </Button>
        </div>
      </form>

      {/* Create New Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newItemName">
                  Item Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="newItemName"
                  value={newItemData.itemName}
                  onChange={(e) => setNewItemData({ ...newItemData, itemName: e.target.value })}
                  placeholder="Enter item name"
                  className={itemErrors.itemName ? 'border-destructive' : ''}
                />
                {itemErrors.itemName && (
                  <p className="text-sm text-destructive">{itemErrors.itemName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newItemCategory">Category</Label>
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
                    <SelectItem value="supplies">Supplies</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newUnitOfMeasure">Unit of Measure</Label>
                <Input
                  id="newUnitOfMeasure"
                  value={newItemData.unitOfMeasure}
                  onChange={(e) => setNewItemData({ ...newItemData, unitOfMeasure: e.target.value })}
                  placeholder="e.g., pcs, kg, m, box"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newAccountId">
                  Account <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={newItemData.accountId}
                  onValueChange={(value) => setNewItemData({ ...newItemData, accountId: value })}
                >
                  <SelectTrigger className={itemErrors.accountId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.accountCode} - {account.accountName} ({account.accountType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {itemErrors.accountId && (
                  <p className="text-sm text-destructive">{itemErrors.accountId}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newDescription">Description</Label>
              <Textarea
                id="newDescription"
                value={newItemData.description}
                onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                placeholder="Item description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setShowItemDialog(false);
              setNewItemData({
                itemName: '',
                itemCategory: 'material',
                unitOfMeasure: 'pcs',
                accountId: '',
                description: '',
              });
              setItemErrors({});
              setCreatingForLineItemIndex(null);
            }}>
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
