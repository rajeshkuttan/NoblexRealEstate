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
import { MoreHorizontal, Plus } from 'lucide-react';

export default function PurchaseInvoiceList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [leaseFilter, setLeaseFilter] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
    fetchPIs();
  }, []);

  useEffect(() => {
    fetchPIs();
  }, [search, statusFilter, propertyFilter, unitFilter, leaseFilter]);

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

  // Refresh list when navigating back from purchase invoice page
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
    if (!confirm('Approve this invoice and post accounting entries?')) return;

    try {
      await purchaseInvoicesAPI.approve(id);
      toast({ title: 'Success', description: 'Invoice approved and accounting entries posted' });
      fetchPIs(true); // Refresh with cache skip
    } catch (error: any) {
      console.error('Approve error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message || 
                          'Failed to approve invoice';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async (id: number, invoiceNumber: string) => {
    if (!window.confirm(`Are you sure you want to cancel Purchase Invoice ${invoiceNumber}?`)) {
      return;
    }

    try {
      await purchaseInvoicesAPI.cancel(id);
      toast({
        title: 'Success',
        description: 'Purchase Invoice cancelled successfully',
      });
      fetchPIs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel purchase invoice',
        variant: 'destructive',
      });
    }
  };

  const canEdit = (status: string) => {
    return status === 'draft';
  };

  const canCancel = (status: string) => {
    return !['paid', 'cancelled'].includes(status);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Invoices</CardTitle>
            </div>
            <Button onClick={() => navigate('/procurement/purchase-invoices/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
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
                <TableHead>Invoice Number</TableHead>
                <TableHead>Supplier Invoice #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Lease</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : purchaseInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center">No purchase invoices found</TableCell>
                </TableRow>
              ) : (
                purchaseInvoices.map((pi) => (
                  <TableRow key={pi.id}>
                    <TableCell className="font-mono">{pi.invoiceNumber}</TableCell>
                    <TableCell className="font-mono">{pi.supplierInvoiceNumber || pi.supplier_invoice_number || 'N/A'}</TableCell>
                    <TableCell>{pi.vendor?.vendorName || 'N/A'}</TableCell>
                    <TableCell>{new Date(pi.invoiceDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{pi.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pi.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                        {pi.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{pi.property?.title || 'N/A'}</TableCell>
                    <TableCell>{pi.unit?.unitNumber || 'N/A'}</TableCell>
                    <TableCell>{pi.lease?.leaseNumber || 'N/A'}</TableCell>
                    <TableCell>{parseFloat(pi.totalAmount || 0).toFixed(2)} AED</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/procurement/purchase-invoices/${pi.id}`)}>
                            View
                          </DropdownMenuItem>
                          {canEdit(pi.status) && (
                            <DropdownMenuItem onClick={() => navigate(`/procurement/purchase-invoices/${pi.id}`)}>
                              Edit
                            </DropdownMenuItem>
                          )}
                          {pi.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleApprove(pi.id)}>
                              Approve
                            </DropdownMenuItem>
                          )}
                          {canCancel(pi.status) && (
                            <DropdownMenuItem 
                              onClick={() => handleCancel(pi.id, pi.invoiceNumber)}
                              className="text-destructive"
                            >
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

    </>
  );
}
