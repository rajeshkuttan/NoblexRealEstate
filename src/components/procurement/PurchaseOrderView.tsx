import { useState, useEffect } from 'react';
import { purchaseOrdersAPI } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Printer, X } from 'lucide-react';

interface PurchaseOrderViewProps {
  poId: number;
  onClose: () => void;
}

export function PurchaseOrderView({ poId, onClose }: PurchaseOrderViewProps) {
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPO();
  }, [poId]);

  const fetchPO = async () => {
    try {
      const response = await purchaseOrdersAPI.getById(poId);
      setPo(response.data?.data?.purchaseOrder || response.data?.data || response.data);
    } catch (error) {
      console.error('Failed to fetch PO details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex justify-center items-center h-40">
            <p>Loading purchase order details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!po) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-6">
            <p className="text-destructive">Failed to load purchase order details.</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle>Purchase Order #{po.poNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 print:space-y-4" id="print-content">
          {/* Print Only Header */}
          <div className="hidden print:block text-center mb-6 border-b pb-4">
             <h1 className="text-2xl font-bold uppercase">Purchase Order</h1>
             <p className="text-lg font-medium text-muted-foreground">#{po.poNumber}</p>
          </div>

          {/* Header Section */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Date:</span> {formatDate(po.poDate)}</p>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Status:</span>
                  <Badge variant="outline">{po.status}</Badge>
                </div>
                {po.workOrderId && <p><span className="font-semibold">Work Order:</span> #{po.workOrderId}</p>}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Vendor Details</h2>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{po.vendor?.vendorName}</p>
                <p>{po.vendor?.contactPerson}</p>
                <p>{po.vendor?.email}</p>
                <p>{po.vendor?.phone}</p>
                {po.vendor?.address && <p className="text-muted-foreground">{po.vendor.address}</p>}
                {po.vendor?.trn && <p>TRN: {po.vendor.trn}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Locations & Delivery */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Property Details</h3>
              {po.property ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{po.property.title}</p>
                  {po.unit && <p>Unit: {po.unit.unitNumber || po.unit.unit_number}</p>}
                  {po.lease && <p>Lease: {po.lease.leaseNumber || po.lease.lease_number}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">General Purchase Order</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">Delivery Information</h3>
              <div className="text-sm space-y-1">
                <p><span className="font-semibold">Expected Date:</span> {formatDate(po.expectedDeliveryDate)}</p>
                {po.deliveryAddress && (
                  <div>
                    <span className="font-semibold">Address:</span>
                    <p className="whitespace-pre-line text-muted-foreground">{po.deliveryAddress}</p>
                  </div>
                )}
                {po.deliveryContactName && <p><span className="font-semibold">Contact:</span> {po.deliveryContactName} {po.deliveryContactPhone && `(${po.deliveryContactPhone})`}</p>}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="font-semibold mb-4">Order Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.lineItems?.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.item?.itemName}</p>
                        <p className="text-xs text-muted-foreground">{item.item?.itemCode}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.item?.unitOfMeasure}
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(item.unitPrice || item.unit_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(item.taxAmount || item.tax_amount || 0).toFixed(2)}
                      <div className="text-[10px] text-muted-foreground">{item.taxClassification || item.tax_classification}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {(parseFloat(item.total) + parseFloat(item.taxAmount || item.tax_amount || 0)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{parseFloat(po.subtotal || 0).toFixed(2)} AED</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax Amount:</span>
                <span>{parseFloat(po.taxAmount || 0).toFixed(2)} AED</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{parseFloat(po.totalAmount || 0).toFixed(2)} AED</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {po.notes && (
            <div>
              <Separator className="my-4" />
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{po.notes}</p>
            </div>
          )}

           {/* Delivery Instructions */}
           {po.deliveryInstructions && (
            <div>
              <Separator className="my-4" />
              <h3 className="font-semibold mb-2">Delivery Instructions</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{po.deliveryInstructions}</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
