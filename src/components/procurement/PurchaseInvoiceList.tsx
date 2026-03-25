import { printDocument, generatePurchaseInvoiceHtml } from "../../utils/printUtils";
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { purchaseInvoicesAPI, propertiesAPI, unitsAPI, leasesAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useConfirm } from '@/hooks/use-confirm';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { PurchaseInvoiceForm } from './PurchaseInvoiceForm';

export default function PurchaseInvoiceList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [leaseFilter, setLeaseFilter] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  
  // Modal State
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  const { toast } = useToast();
  const { confirm, isOpen: isConfirmOpen, onConfirm, onCancel, options: confirmOptions } = useConfirm();

  useEffect(() => {
    fetchProperties();
    fetchPIs();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchPIs();
  }, [search, statusFilter, propertyFilter, unitFilter, leaseFilter]);

  const fetchStats = async () => {
    try {
      const response = await purchaseInvoicesAPI.getStats();
      setStats(response.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

  useEffect(() => {
    if (propertyFilter) {
      fetchUnits(parseInt(propertyFilter));
    } else {
      setUnits([]);
      setUnitFilter('');
    }
  }, [propertyFilter]);

  useEffect(() => {
    if (unitFilter) {
      fetchLeases(parseInt(unitFilter));
    } else {
      setLeases([]);
      setLeaseFilter('');
    }
  }, [unitFilter]);

  // Refresh list when navigating back from purchase invoice page (Deprecating soon but keeping for backward compat)
  useEffect(() => {
    if (location.state?.fromPurchaseInvoice || location.state?.refresh) {
      fetchPIs(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchProperties = async () => {
    try {
      const response = await propertiesAPI.getAll({ page: 1, limit: 100 });
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

  const fetchPIs = async (skipCache = false) => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (propertyFilter) params.propertyId = propertyFilter;
      if (unitFilter) params.unitId = unitFilter;
      if (leaseFilter) params.leaseId = leaseFilter;

      const response = await purchaseInvoicesAPI.getAll(params, skipCache);
      const data = response.data?.data || {};
      setPurchaseInvoices(data.purchaseInvoices || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch purchase invoices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    const confirmed = await confirm({
      title: 'Approve Invoice',
      description: 'Approve this invoice and post accounting entries?',
      confirmText: 'Approve',
    });

    if (!confirmed) return;

    try {
      await purchaseInvoicesAPI.approve(id);
      toast({ title: 'Success', description: 'Invoice approved and accounting entries posted' });
      fetchPIs(true); // Refresh with cache skip
    } catch (error: any) {
      console.error('Approve error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to approve invoice';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async (id: number, invoiceNumber: string) => {
    const confirmed = await confirm({
      title: 'Cancel Purchase Invoice',
      description: `Are you sure you want to cancel Purchase Invoice ${invoiceNumber}?`,
      confirmText: 'Cancel Invoice',
      variant: 'destructive'
    });

    if (!confirmed) {
      return;
    }

    try {
      await purchaseInvoicesAPI.cancel(id);
      toast({
        title: 'Success',
        description: 'Purchase Invoice cancelled successfully',
      });
      fetchPIs(true);
    } catch (error: any) {
      console.error('Failed to cancel purchase invoice:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel purchase invoice',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = async (id: number) => {
      try {
          const response = await purchaseInvoicesAPI.getById(id);
          const pi = response.data?.data?.purchaseInvoice || response.data;
          
          if (!pi) return;
  
          const htmlContent = generatePurchaseInvoiceHtml(pi);
          printDocument(`Purchase Invoice - ${pi.invoiceNumber}`, htmlContent);
      } catch (error) {
          console.error('Print error:', error);
          toast({ title: 'Error', description: 'Failed to generate print view', variant: 'destructive' });
      }
  };

  const openNewForm = () => {
      setSelectedInvoice(null);
      setShowForm(true);
  };

  const openEditForm = (invoice: any) => {
      setSelectedInvoice(invoice);
      setShowForm(true);
  };

  const handleFormClose = (refresh?: boolean) => {
      setShowForm(false);
      setSelectedInvoice(null);
      if (refresh) fetchPIs(true);
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

    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Purchase Invoices</CardTitle>
          </div>
          <Button onClick={openNewForm}>
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Invoice
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters and Table logic mostly unchanged, just updating action buttons */}
        <div className="flex flex-wrap gap-4 mb-4">
           {/* Filters... */}
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <SearchableSelect
              value={propertyFilter || "all"}
              onValueChange={(value) => setPropertyFilter(value === "all" ? "" : value)}
              placeholder="All Properties"
              searchPlaceholder="Search properties..."
              emptyMessage="No properties found"
              className="w-[200px]"
              options={[
                { value: "all", label: "All Properties" },
                ...properties.map((property) => ({
                  value: property.id.toString(),
                  label: property.title,
                })),
              ]}
            />
            <SearchableSelect
              value={unitFilter || "all"}
              onValueChange={(value) => setUnitFilter(value === "all" ? "" : value)}
              disabled={!propertyFilter}
              placeholder={propertyFilter ? "All Units" : "Select Property"}
              searchPlaceholder="Search units..."
              emptyMessage="No units found"
              className="w-[180px]"
              options={[
                { value: "all", label: "All Units" },
                ...units.map((unit) => ({
                  value: unit.id.toString(),
                  label: unit.unitNumber || unit.unit_number,
                })),
              ]}
            />
            <SearchableSelect
              value={leaseFilter || "all"}
              onValueChange={(value) => setLeaseFilter(value === "all" ? "" : value)}
              disabled={!unitFilter}
              placeholder={unitFilter ? "All Leases" : "Select Unit"}
              searchPlaceholder="Search leases..."
              emptyMessage="No leases found"
              className="w-[180px]"
              options={[
                { value: "all", label: "All Leases" },
                ...leases.map((lease) => ({
                  value: lease.id.toString(),
                  label: lease.leaseNumber || lease.lease_number,
                })),
              ]}
            />
          </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : purchaseInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No purchase invoices found</TableCell>
              </TableRow>
            ) : (
              purchaseInvoices.map((pi) => (
                <TableRow key={pi.id}>
                  <TableCell className="font-mono">{pi.invoiceNumber}</TableCell>
                  <TableCell>{pi.vendor?.vendorName || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{pi.status}</Badge>
                  </TableCell>
                  <TableCell>{parseFloat(pi.subtotal || pi.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>{parseFloat(pi.taxAmount || 0).toFixed(2)}</TableCell>
                  <TableCell>{parseFloat(pi.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>{new Date(pi.invoiceDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(pi.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={pi.paymentStatus === 'paid' ? 'default' : pi.paymentStatus === 'overdue' ? 'destructive' : 'secondary'}>
                        {pi.paymentStatus || 'Unpaid'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <DropdownMenuItem onClick={() => handlePrint(pi.id)}>
                             Print
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditForm(pi)}>
                          View/Edit
                        </DropdownMenuItem>
                        {pi.status === 'draft' || pi.status === 'pending_approval' ? (
                           <DropdownMenuItem onClick={() => handleApprove(pi.id)}>
                             Approve
                           </DropdownMenuItem>
                        ) : null}
                        {(pi.status === 'draft' || pi.status === 'pending_approval' || pi.status === 'approved') && (
                            <DropdownMenuItem onClick={() => handleCancel(pi.id, pi.invoiceNumber)} className="text-red-600">
                                Cancel
                            </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    
    {showForm && (
        <PurchaseInvoiceForm 
            purchaseInvoice={selectedInvoice} 
            onClose={handleFormClose} 
        />
    )}

      <ConfirmationDialog 
        isOpen={isConfirmOpen}
        onClose={onCancel}
        onConfirm={onConfirm}
        title={confirmOptions?.title || ""}
        description={confirmOptions?.description || ""}
        confirmText={confirmOptions?.confirmText}
        cancelText={confirmOptions?.cancelText}
        variant={confirmOptions?.variant}
      />
    </div>
  );
}
