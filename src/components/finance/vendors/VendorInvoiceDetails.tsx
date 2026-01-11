import { useState, useEffect } from 'react';
import { vendorInvoicesAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Calendar,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface VendorInvoiceDetailsProps {
  invoiceId: number;
  onClose: (refresh?: boolean) => void;
}

export function VendorInvoiceDetails({ invoiceId, onClose }: VendorInvoiceDetailsProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoiceDetails();
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    try {
      const { data } = await vendorInvoicesAPI.getById(invoiceId);
      setInvoice(data.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch invoice details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setActionLoading(true);
      await vendorInvoicesAPI.submit(invoiceId);
      toast({
        title: 'Success',
        description: 'Invoice submitted for approval',
      });
      fetchInvoiceDetails();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit invoice',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovalAction = (action: 'approve' | 'reject') => {
    setApprovalAction(action);
    setApprovalNotes('');
    setShowApprovalDialog(true);
  };

  const confirmApproval = async () => {
    try {
      setActionLoading(true);
      await vendorInvoicesAPI.approve(invoiceId, {
        action: approvalAction,
        notes: approvalNotes,
      });
      toast({
        title: 'Success',
        description: `Invoice ${approvalAction}d successfully`,
      });
      setShowApprovalDialog(false);
      fetchInvoiceDetails();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || `Failed to ${approvalAction} invoice`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      draft: 'secondary',
      pending_approval: 'default',
      approved: 'default',
      rejected: 'destructive',
    };
    const colors: { [key: string]: string } = {
      draft: 'bg-gray-500',
      pending_approval: 'bg-yellow-500',
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
    };
    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      unpaid: 'destructive',
      partially_paid: 'default',
      paid: 'default',
      overdue: 'destructive',
    };
    const colors: { [key: string]: string } = {
      unpaid: 'bg-red-500',
      partially_paid: 'bg-yellow-500',
      paid: 'bg-green-500',
      overdue: 'bg-red-700',
    };
    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  if (loading || !invoice) {
    return (
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent>
          <div className="py-8 text-center">Loading invoice details...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice {invoice.invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Vendor invoice details and approval workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status and Dates */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium">Payment Status</p>
                  <div className="mt-1">{getPaymentStatusBadge(invoice.paymentStatus)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium">Invoice Date</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(invoice.invoiceDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vendor and Property Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Vendor Name</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.vendor?.vendorName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Contact</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.vendor?.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">TRN</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.vendor?.trn || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {invoice.property && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Property Name</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.property.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.property.location || 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24 text-right">Qty</TableHead>
                    <TableHead className="w-32 text-right">Unit Price</TableHead>
                    <TableHead className="w-32 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems && invoice.lineItems.length > 0 ? (
                    invoice.lineItems.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No line items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Amounts Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Subtotal:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">VAT:</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(invoice.taxAmount)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-base font-semibold">Total Amount:</span>
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {invoice.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Approval History */}
          {invoice.approvedBy && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approval History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Approved By</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.approver?.name || 'N/A'}
                  </p>
                </div>
                {invoice.approvedAt && (
                  <div>
                    <p className="text-sm font-medium">Approved At</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(invoice.approvedAt)}
                    </p>
                  </div>
                )}
                {invoice.approvalNotes && (
                  <div>
                    <p className="text-sm font-medium">Notes</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.approvalNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Approval Dialog */}
          {showApprovalDialog && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <p className="font-medium">
                    {approvalAction === 'approve' ? 'Approve' : 'Reject'} Invoice
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="approvalNotes">Notes (Optional)</Label>
                    <Textarea
                      id="approvalNotes"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder={`Add notes for ${approvalAction === 'approve' ? 'approval' : 'rejection'}...`}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={confirmApproval}
                      disabled={actionLoading}
                      variant={approvalAction === 'approve' ? 'default' : 'destructive'}
                    >
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm {approvalAction === 'approve' ? 'Approval' : 'Rejection'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowApprovalDialog(false)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {/* Action buttons based on status */}
          {invoice.status === 'draft' && (
            <Button onClick={handleSubmit} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit for Approval
            </Button>
          )}

          {invoice.status === 'pending_approval' && (
            <>
              <Button
                onClick={() => handleApprovalAction('approve')}
                disabled={actionLoading}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleApprovalAction('reject')}
                disabled={actionLoading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}

          <Button variant="outline" onClick={() => onClose()}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

