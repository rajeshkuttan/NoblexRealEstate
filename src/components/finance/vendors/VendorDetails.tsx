import { useState, useEffect } from 'react';
import { vendorsAPI, vendorInvoicesAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { DocumentUpload } from '@/components/common/DocumentUpload';
import { DocumentList } from '@/components/common/DocumentList';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface VendorDetailsProps {
  vendorId: number;
  onClose: () => void;
}

export function VendorDetails({ vendorId, onClose }: VendorDetailsProps) {
  const [vendor, setVendor] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendorDetails();
    fetchVendorInvoices();
    fetchDocuments();
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    try {
      const { data } = await vendorsAPI.getById(vendorId);
      setVendor(data.data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch vendor details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorInvoices = async () => {
    try {
      const { data } = await vendorInvoicesAPI.getAll({ vendorId, limit: 50 });
      setInvoices(data.data.invoices || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
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

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      active: 'default',
      inactive: 'secondary',
      blocked: 'destructive',
      draft: 'secondary',
      pending_approval: 'default',
      approved: 'default',
      rejected: 'destructive',
    };
    const colors: { [key: string]: string } = {
      active: 'bg-green-500',
      inactive: 'bg-gray-500',
      blocked: 'bg-red-500',
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

  if (loading || !vendor) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="py-8 text-center">Loading vendor details...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const stats = vendor.statistics || {
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    overdueAmount: 0,
    averagePaymentDays: 0,
  };

  const paymentProgress = stats.totalAmount > 0 
    ? (stats.paidAmount / stats.totalAmount) * 100 
    : 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {vendor.vendorName}
          </DialogTitle>
          <DialogDescription>
            Vendor details and transaction history
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">
              Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Vendor Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vendor Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Vendor Name</p>
                      <p className="text-sm text-muted-foreground">
                        {vendor.vendorName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div>
                      <p className="text-sm font-medium">Contact Person</p>
                      <p className="text-sm text-muted-foreground">
                        {vendor.contactPerson || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {vendor.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">
                        {vendor.phone || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {vendor.address && (
                    <div className="flex items-start gap-3 md:col-span-2">
                      <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Address</p>
                        <p className="text-sm text-muted-foreground">
                          {vendor.address}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">TRN</p>
                      <p className="text-sm text-muted-foreground">
                        {vendor.trn || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Payment Terms</p>
                      <p className="text-sm text-muted-foreground">
                        {vendor.paymentTerms || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <div className="mt-1">
                        {getStatusBadge(vendor.status)}
                      </div>
                    </div>
                  </div>
                </div>

                {vendor.bankDetails && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-3">Bank Details</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium">Bank Name</p>
                          <p className="text-sm text-muted-foreground">
                            {vendor.bankDetails.bankName || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Account Number</p>
                          <p className="text-sm text-muted-foreground">
                            {vendor.bankDetails.accountNumber || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">IBAN</p>
                          <p className="text-sm text-muted-foreground">
                            {vendor.bankDetails.iban || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">SWIFT Code</p>
                          <p className="text-sm text-muted-foreground">
                            {vendor.bankDetails.swiftCode || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {vendor.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground">
                        {vendor.notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Total Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalInvoices}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Paid Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.paidAmount)}
                  </div>
                  <Progress value={paymentProgress} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    Unpaid Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(stats.unpaidAmount)}
                  </div>
                  {stats.overdueAmount > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Overdue: {formatCurrency(stats.overdueAmount)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {stats.averagePaymentDays > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Average Payment Days</p>
                      <p className="text-2xl font-bold">{stats.averagePaymentDays} days</p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No invoices found for this vendor
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(invoice.paymentStatus)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <DocumentUpload
              entityType="vendor"
              entityId={vendorId}
              onUploadSuccess={fetchDocuments}
            />
            <DocumentList
              entityType="vendor"
              entityId={vendorId}
              documents={documents}
              onDelete={fetchDocuments}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

