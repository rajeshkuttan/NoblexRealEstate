import { useState, useEffect } from 'react';
import { vendorInvoicesAPI, vendorsAPI, propertiesAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { VendorInvoiceForm } from './VendorInvoiceForm';
import { VendorInvoiceDetails } from './VendorInvoiceDetails';

interface VendorInvoice {
  id: number;
  invoiceNumber: string;
  vendorId: number;
  vendorName?: string;
  propertyId?: number;
  propertyName?: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
}

export default function VendorInvoiceList() {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
    fetchStats();
    fetchVendors();
    fetchProperties();
  }, [page, search, vendorFilter, propertyFilter, statusFilter, paymentStatusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data } = await vendorInvoicesAPI.getAll({
        page,
        limit: 10,
        search,
        vendorId: vendorFilter || undefined,
        propertyId: propertyFilter || undefined,
        status: statusFilter || undefined,
        paymentStatus: paymentStatusFilter || undefined,
      });
      setInvoices(data.data.invoices);
      setTotalPages(data.data.pagination.totalPages);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch invoices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await vendorInvoicesAPI.getStats();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data } = await vendorsAPI.getAll({ limit: 100 });
      setVendors(data.data.vendors);
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const { data } = await propertiesAPI.getAll({ limit: 100 });
      setProperties(data.data.properties);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await vendorInvoicesAPI.delete(id);
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
      fetchInvoices();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete invoice',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setShowForm(true);
  };

  const handleView = (invoice: VendorInvoice) => {
    setSelectedInvoice(invoice);
    setShowDetails(true);
  };

  const handleFormClose = (refresh?: boolean) => {
    setShowForm(false);
    setSelectedInvoice(null);
    if (refresh) {
      fetchInvoices();
      fetchStats();
    }
  };

  const handleDetailsClose = (refresh?: boolean) => {
    setShowDetails(false);
    setSelectedInvoice(null);
    if (refresh) {
      fetchInvoices();
      fetchStats();
    }
  };

  const toggleInvoiceSelection = (id: number) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAllInvoices = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map((i) => i.id));
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

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.totalAmount)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.unpaidAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.unpaidCount} invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-700" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {formatCurrency(stats.overdueAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.overdueCount} invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.paidAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.paidCount} invoices
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Accounts Payable</CardTitle>
              <CardDescription>
                Manage vendor invoices and payments
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>

            <Select
              value={vendorFilter || 'all'}
              onValueChange={(value) => {
                setVendorFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id.toString()}>
                    {vendor.vendorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={propertyFilter || 'all'}
              onValueChange={(value) => {
                setPropertyFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id.toString()}>
                    {property.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => {
                setStatusFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={paymentStatusFilter || 'all'}
              onValueChange={(value) => {
                setPaymentStatusFilter(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedInvoices.length > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-muted p-2">
              <span className="text-sm">
                {selectedInvoices.length} selected
              </span>
              <Button variant="outline" size="sm">
                Bulk Approve
              </Button>
              <Button variant="outline" size="sm">
                Bulk Delete
              </Button>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="py-8 text-center">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No invoices found. Create your first invoice to get started.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedInvoices.length === invoices.length}
                        onCheckedChange={toggleAllInvoices}
                      />
                    </TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.vendorName}</TableCell>
                      <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(invoice.subtotal)}</TableCell>
                      <TableCell>{formatCurrency(invoice.taxAmount)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.totalAmount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(invoice.paymentStatus)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleView(invoice)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(invoice.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoice Form Dialog */}
      {showForm && (
        <VendorInvoiceForm
          invoice={selectedInvoice}
          onClose={handleFormClose}
        />
      )}

      {/* Invoice Details Dialog */}
      {showDetails && selectedInvoice && (
        <VendorInvoiceDetails
          invoiceId={selectedInvoice.id}
          onClose={handleDetailsClose}
        />
      )}
    </div>
  );
}

