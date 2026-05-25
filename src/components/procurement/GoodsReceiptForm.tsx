import { useState, useEffect } from 'react';
import { goodsReceiptsAPI, purchaseOrdersAPI, propertiesAPI, unitsAPI, itemsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDocumentNumberingMode } from '@/hooks/useDocumentNumberingMode';

interface GoodsReceiptFormProps {
  goodsReceipt?: any;
  onClose: (refresh?: boolean) => void;
}

export function GoodsReceiptForm({ goodsReceipt, onClose }: GoodsReceiptFormProps) {
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    grNumber: '',
    purchaseOrderId: '',
    receiptDate: new Date().toISOString().split('T')[0],
    receivedBy: '',
    notes: '',
    deliveryPropertyId: '',
    deliveryUnitId: '',
    deliveryAddress: '',
    deliveryContactName: '',
    deliveryContactPhone: '',
    deliveryNotes: '',
  });
  const [lineItems, setLineItems] = useState<any[]>([]);
  const { toast } = useToast();
  const { isManualNumbering, loading: numberingModeLoading } = useDocumentNumberingMode('Goods Receipt Note');

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await fetchPOs();
        await fetchProperties();
        const itemsRes = await itemsAPI.getAll();
        const itemsArray = itemsRes.data?.data?.items || itemsRes.data?.data || [];
        setAllItems(Array.isArray(itemsArray) ? itemsArray : []);
        
        if (goodsReceipt) {
          if (goodsReceipt.id && !goodsReceipt.purchaseOrder) {
            await fetchGRDetails(goodsReceipt.id);
          } else {
            await populateFormData(goodsReceipt);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [goodsReceipt]);

  useEffect(() => {
    if (formData.deliveryPropertyId) {
      fetchUnits(parseInt(formData.deliveryPropertyId));
    } else {
      setUnits([]);
      setFormData(prev => ({ ...prev, deliveryUnitId: '' }));
    }
  }, [formData.deliveryPropertyId]);

  useEffect(() => {
    // Auto-populate delivery address when property/unit selected
    if (formData.deliveryPropertyId || formData.deliveryUnitId) {
      updateDeliveryAddress();
    }
  }, [formData.deliveryPropertyId, formData.deliveryUnitId]);

  const fetchGRDetails = async (grId: number) => {
    try {
      const response = await goodsReceiptsAPI.getById(grId);
      const gr = response.data?.data?.goodsReceipt;
      if (gr) {
        populateFormData(gr);
        // Add the PO to the purchaseOrders list if it's not already there
        if (gr.purchaseOrder) {
          setSelectedPO(gr.purchaseOrder);
          // Check if PO is already in the list
          const poExists = purchaseOrders.some(po => po.id === gr.purchaseOrder.id);
          if (!poExists) {
            setPurchaseOrders(prev => [...prev, gr.purchaseOrder]);
          }
        } else if (gr.purchaseOrderId) {
          // If PO is not included, fetch it
          await handlePOSelect(gr.purchaseOrderId.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch GR details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load goods receipt details',
        variant: 'destructive',
      });
    }
  };

  const populateFormData = async (gr: any) => {
    setFormData({
      grNumber: gr.grNumber || gr.gr_number || '',
      purchaseOrderId: gr.purchaseOrderId?.toString() || gr.purchase_order_id?.toString() || '',
      receiptDate: gr.receiptDate ? new Date(gr.receiptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      receivedBy: gr.receivedBy?.toString() || gr.received_by?.toString() || '',
      notes: gr.notes || '',
      deliveryPropertyId: gr.deliveryPropertyId?.toString() || gr.delivery_property_id?.toString() || '',
      deliveryUnitId: gr.deliveryUnitId?.toString() || gr.delivery_unit_id?.toString() || '',
      deliveryAddress: gr.deliveryAddress || gr.delivery_address || '',
      deliveryContactName: gr.deliveryContactName || gr.delivery_contact_name || '',
      deliveryContactPhone: gr.deliveryContactPhone || gr.delivery_contact_phone || '',
      deliveryNotes: gr.deliveryNotes || gr.delivery_notes || '',
    });

    // Fetch units if property is set
    if (gr.deliveryPropertyId || gr.delivery_property_id) {
      await fetchUnits(parseInt(gr.deliveryPropertyId || gr.delivery_property_id));
    }
    // Ensure lineItems is always an array
    let items = gr.lineItems || [];
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        console.error('Failed to parse lineItems:', e);
        items = [];
      }
    }
    if (!Array.isArray(items)) {
      items = [];
    }
    setLineItems(items);
    
    // Set selected PO if available and add to purchaseOrders list if not already there
    if (gr.purchaseOrder) {
      setSelectedPO(gr.purchaseOrder);
      setPurchaseOrders(prev => {
        const poExists = prev.some(po => po.id === gr.purchaseOrder.id);
        if (!poExists) {
          return [...prev, gr.purchaseOrder];
        }
        return prev;
      });
    }
  };

  const fetchPOs = async () => {
    try {
      // When viewing an existing GR, fetch all POs to include the current one
      // When creating, only fetch eligible POs
      const params: any = { limit: 100 };
      if (!goodsReceipt) {
        params.status = 'sent,acknowledged,partially_received';
      }
      
      const response = await purchaseOrdersAPI.getAll(params, true);
      const purchaseOrdersData = response.data?.data?.purchaseOrders || response.data?.data || [];
      console.log('Fetched POs for GRN:', purchaseOrdersData.length, purchaseOrdersData);
      setPurchaseOrders(purchaseOrdersData);
      
      if (!goodsReceipt && purchaseOrdersData.length === 0) {
        toast({
          title: 'Info',
          description: 'No purchase orders available for goods receipt. POs must be in sent, acknowledged, or partially received status.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch purchase orders:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch purchase orders',
        variant: 'destructive',
      });
    }
  };

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAll();
      const itemsArray = response.data?.data?.items || response.data?.data || [];
      setAllItems(Array.isArray(itemsArray) ? itemsArray : []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await propertiesAPI.getAll({ page: 1, limit: 500 });
      setProperties(response.data?.properties || []);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
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

  const updateDeliveryAddress = async () => {
    if (!formData.deliveryPropertyId) {
      return;
    }

    try {
      const property = properties.find(p => p.id.toString() === formData.deliveryPropertyId);
      if (!property) return;

      let addressParts = [property.location || ''];
      if (property.emirate) addressParts.push(property.emirate);
      if (property.community) addressParts.push(property.community);

      if (formData.deliveryUnitId) {
        const unit = units.find(u => u.id.toString() === formData.deliveryUnitId);
        if (unit) {
          addressParts.push(`Unit ${unit.unitNumber || unit.unit_number || ''}`);
        }
      }

      const address = addressParts.filter(Boolean).join(', ');
      if (address && !formData.deliveryAddress) {
        setFormData(prev => ({ ...prev, deliveryAddress: address }));
      }
    } catch (error) {
      console.error('Failed to update delivery address:', error);
    }
  };

  const handlePOSelect = async (poId: string, existingPO?: any) => {
    try {
      let po = existingPO;
      if (!po) {
        const response = await purchaseOrdersAPI.getById(parseInt(poId), true);
        po = response.data?.data?.purchaseOrder;
      }
      setSelectedPO(po);
      
      // Auto-populate delivery info from PO if not already set
      if (!goodsReceipt && po) {
        if (po.propertyId && !formData.deliveryPropertyId) {
          setFormData(prev => ({ ...prev, deliveryPropertyId: po.propertyId.toString() }));
          await fetchUnits(po.propertyId);
        }
        if (po.unitId && !formData.deliveryUnitId) {
          setFormData(prev => ({ ...prev, deliveryUnitId: po.unitId.toString() }));
        }
        if (po.deliveryAddress && !formData.deliveryAddress) {
          setFormData(prev => ({ ...prev, deliveryAddress: po.deliveryAddress }));
        }
        if (po.deliveryContactName && !formData.deliveryContactName) {
          setFormData(prev => ({ ...prev, deliveryContactName: po.deliveryContactName }));
        }
        if (po.deliveryContactPhone && !formData.deliveryContactPhone) {
          setFormData(prev => ({ ...prev, deliveryContactPhone: po.deliveryContactPhone }));
        }
      }
      
      // Populate line items from PO only if we're creating a new GR
      // For existing GRs, keep the existing line items
      if (!goodsReceipt && po?.lineItems) {
        // Ensure lineItems is an array before mapping
        let poLineItems = po.lineItems;
        if (typeof poLineItems === 'string') {
          try {
            poLineItems = JSON.parse(poLineItems);
          } catch (e) {
            console.error('Failed to parse PO lineItems:', e);
            poLineItems = [];
          }
        }
        if (Array.isArray(poLineItems)) {
          const items = poLineItems
            .map((item: any) => {
              // pending_qty should come from the API, default to ordered_qty if not present
              // If pending_qty is explicit 0, it means fully received.
              // If pending_qty is undefined, it's a new PO or legacy data, so use quantity.
              const pendingQty = item.pending_qty !== undefined ? item.pending_qty : item.quantity;
              
              return {
                item_id: item.item_id,
                itemName: item.itemName || item.item?.itemName || `Item ${item.item_id}`,
                itemCode: item.itemCode || item.item?.itemCode,
                ordered_qty: item.quantity,
                received_qty: pendingQty, // Default to remaining quantity
                unit_price: item.unit_price,
                pending_qty: pendingQty
              };
            })
            // Filter out items that are fully received (pending_qty is 0)
            .filter((item: any) => item.pending_qty > 0);
            
          setLineItems(items);
          
          if (items.length === 0) {
            toast({
              title: 'Info',
              description: 'All items in this Purchase Order have been fully received.',
              variant: 'default',
            });
          }
        } else {
          setLineItems([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch PO details:', error);
    }
  };

  const updateLineItem = (index: number, receivedQty: number) => {
    const updated = [...lineItems];
    // Use pending_qty if available (for new GRs), otherwise use ordered_qty as absolute max
    // Note: modification of existing GRs might need different logic, but for new GRs:
    const maxQty = updated[index].pending_qty !== undefined ? updated[index].pending_qty : updated[index].ordered_qty;
    
    if (receivedQty > maxQty) {
      toast({
        title: 'Validation Error',
        description: `Received quantity cannot exceed remaining quantity (${maxQty})`,
        variant: 'destructive',
      });
      return;
    }
    updated[index].received_qty = receivedQty;
    setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedGrNumber = formData.grNumber.trim();
    if (!goodsReceipt && isManualNumbering && !trimmedGrNumber) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a goods receipt number before saving',
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

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        grNumber: isManualNumbering ? trimmedGrNumber : undefined,
        purchaseOrderId: parseInt(formData.purchaseOrderId),
        receivedBy: formData.receivedBy ? parseInt(formData.receivedBy) : undefined,
        deliveryPropertyId: formData.deliveryPropertyId ? parseInt(formData.deliveryPropertyId) : undefined,
        deliveryUnitId: formData.deliveryUnitId ? parseInt(formData.deliveryUnitId) : undefined,
        lineItems,
      };

      if (goodsReceipt) {
        await goodsReceiptsAPI.update(goodsReceipt.id, submitData);
        toast({ title: 'Success', description: 'Goods receipt updated successfully' });
      } else {
        await goodsReceiptsAPI.create(submitData);
        toast({ title: 'Success', description: 'Goods receipt created successfully' });
      }

      onClose(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save goods receipt',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[100vw] w-screen h-screen max-h-screen rounded-none m-0 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{goodsReceipt ? 'Edit Goods Receipt' : 'New Goods Receipt'}</DialogTitle>
          <DialogDescription>
            {goodsReceipt ? 'Update goods receipt details' : 'Create a new goods receipt for a purchase order'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <form id="goods-receipt-form" onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>GRN Number</Label>
              <Input
                value={goodsReceipt ? (goodsReceipt.grNumber || formData.grNumber) : formData.grNumber}
                onChange={(e) => setFormData({ ...formData, grNumber: e.target.value })}
                disabled={!!goodsReceipt || numberingModeLoading || !isManualNumbering}
                placeholder={isManualNumbering ? "Enter GRN number" : "Auto-generated"}
                className={!isManualNumbering || !!goodsReceipt ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Order *</Label>
              <SearchableSelect
                value={formData.purchaseOrderId}
                onValueChange={(value) => {
                  setFormData({ ...formData, purchaseOrderId: value });
                  handlePOSelect(value);
                }}
                disabled={!!goodsReceipt}
                placeholder={purchaseOrders.length === 0 ? "No POs available" : "Select PO"}
                searchPlaceholder="Search purchase orders..."
                emptyMessage="No purchase orders available"
                options={purchaseOrders.map((po) => ({
                  value: po.id.toString(),
                  label: `${po.poNumber || po.po_number} - ${po.vendor?.vendorName || po.vendor?.vendor_name || 'N/A'}`,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt Date *</Label>
              <Input
                type="date"
                value={formData.receiptDate}
                onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
              />
            </div>
          </div>

          {selectedPO && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier/Vendor</Label>
                <Input
                  value={selectedPO.vendor?.vendorName || selectedPO.vendor?.vendor_name || 'N/A'}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>PO Number</Label>
                <Input
                  value={selectedPO.poNumber || selectedPO.po_number || 'N/A'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          )}

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Delivery Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Property</Label>
                <SearchableSelect
                  value={formData.deliveryPropertyId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, deliveryPropertyId: value === "none" ? "" : value, deliveryUnitId: '' })}
                  placeholder="Select property (optional)"
                  searchPlaceholder="Search properties..."
                  emptyMessage="No properties found"
                  options={[
                    { value: "none", label: "None" },
                    ...properties.map((property) => ({
                      value: property.id.toString(),
                      label: `${property.title} - ${property.location}`,
                    })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Unit</Label>
                <SearchableSelect
                  value={formData.deliveryUnitId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, deliveryUnitId: value === "none" ? "" : value })}
                  disabled={!formData.deliveryPropertyId}
                  placeholder={formData.deliveryPropertyId ? "Select unit (optional)" : "Select property first"}
                  searchPlaceholder="Search units..."
                  emptyMessage="No units found"
                  options={[
                    { value: "none", label: "None" },
                    ...units.map((unit) => ({
                      value: unit.id.toString(),
                      label: `${unit.unitNumber || unit.unit_number} - ${unit.type}`,
                    })),
                  ]}
                />
              </div>
            </div>
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
                  placeholder="Person who received"
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
              <Label>Delivery Notes</Label>
              <Textarea
                placeholder="Delivery-specific notes"
                value={formData.deliveryNotes}
                onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {Array.isArray(lineItems) && lineItems.length > 0 && (
            <div className="space-y-2">
              <Label>Line Items</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Ordered Qty</TableHead>
                    <TableHead>Received Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900">
                            {(() => {
                              const itemId = parseInt(item.item_id);
                              const resolvedItem = Array.isArray(allItems) ? allItems.find(i => i.id === itemId) : null;
                              return resolvedItem?.itemName || item.item?.itemName || item.itemName || `Item ${item.item_id}`;
                            })()}
                          </span>
                          {(() => {
                              const itemId = parseInt(item.item_id);
                              const resolvedItem = Array.isArray(allItems) ? allItems.find(i => i.id === itemId) : null;
                              const code = resolvedItem?.itemCode || item.item?.itemCode || item.itemCode;
                              return code ? (
                                <span className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-wider">{code}</span>
                              ) : null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>{item.ordered_qty}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.received_qty}
                          onChange={(e) => updateLineItem(index, parseFloat(e.target.value) || 0)}
                          min="0"
                          max={item.ordered_qty}
                        />
                      </TableCell>
                      <TableCell>{item.unit_price?.toFixed(2) || '0.00'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button type="button" variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button type="submit" form="goods-receipt-form" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {goodsReceipt ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GoodsReceiptForm;
