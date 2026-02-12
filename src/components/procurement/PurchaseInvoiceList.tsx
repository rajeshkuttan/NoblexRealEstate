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
import { PurchaseInvoiceForm } from './PurchaseInvoiceForm';

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
  
  // Modal State
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
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
    if (!confirm('Approve this invoice and post accounting entries?')) return;

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
    if (!window.confirm(`Are you sure you want to cancel Purchase Invoice ${invoiceNumber}?`)) {
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
  
          const printWindow = window.open('', '_blank');
          if (!printWindow) return;
  
          let lineItemsHtml = '';
          let items = pi.lineItems || [];
          if (typeof items === 'string') try { items = JSON.parse(items); } catch(e){}
          
          items.forEach((item: any, index: number) => {
              const qty = parseFloat(item.quantity || 0);
              const price = parseFloat(item.unit_price || 0);
              const subtotal = parseFloat(item.subtotal || 0) || (qty * price); 
              const tax = parseFloat(item.tax_amount || 0);
              const total = parseFloat(item.total || 0) || (subtotal + tax);
              const itemName = item.itemName || item.item?.itemName || 'Unknown Item';

              lineItemsHtml += `
                  <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${itemName}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${qty}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${price.toFixed(2)}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${subtotal.toFixed(2)}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${tax.toFixed(2)}</td>
                      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${total.toFixed(2)}</td>
                  </tr>
              `;
          });
  
          const htmlContent = `
              <!DOCTYPE html>
              <html>
              <head>
                  <title>Purchase Invoice - ${pi.invoiceNumber}</title>
                  <style>
                      @media print {
                          @page { size: A4; margin: 0; }
                          body { margin-top: 2.5in; margin-left: 0.5in; margin-right: 0.5in; margin-bottom: 0.5in; }
                      }
                      body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; }
                      .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                      .title { font-size: 24px; font-weight: bold; text-decoration: underline; }
                      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                      .info-item { margin-bottom: 5px; }
                      .label { font-weight: bold; width: 140px; display: inline-block; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                      th { text-align: left; background-color: #f5f5f5; padding: 10px; border-bottom: 2px solid #ddd; }
                      td { font-size: 13px; }
                      .totals-section { display: flex; justify-content: flex-end; }
                      .totals-table { width: 300px; }
                      .totals-table td { padding: 5px 10px; }
                      .totals-table .total-row { font-weight: bold; border-top: 1px solid #000; border-bottom: 1px double #000; }
                      .footer { margin-top: 50px; display: flex; justify-content: space-between; }
                      .signature-line { border-top: 1px solid #000; width: 200px; padding-top: 5px; text-align: center; }
                  </style>
              </head>
              <body>
                  <div class="header">
                      <div class="title">PURCHASE INVOICE</div>
                      <div>
                          <div class="info-item"><span class="label">Invoice No:</span> ${pi.invoiceNumber}</div>
                          <div class="info-item"><span class="label">Date:</span> ${new Date(pi.invoiceDate).toLocaleDateString()}</div>
                          <div class="info-item"><span class="label">Due Date:</span> ${pi.dueDate ? new Date(pi.dueDate).toLocaleDateString() : 'N/A'}</div>
                          <div class="info-item"><span class="label">Status:</span> ${pi.status.toUpperCase()}</div>
                      </div>
                  </div>
  
                  <div class="info-grid">
                      <div>
                          <div style="font-weight: bold; margin-bottom: 5px;">Bill To:</div>
                          ${pi.deliveryAddress ? `<div>${pi.deliveryAddress}</div>` : ''}
                          <div style="margin-top: 10px;">
                             ${pi.deliveryContactName ? `<div>Attn: ${pi.deliveryContactName}</div>` : ''}
                             ${pi.deliveryContactPhone ? `<div>Ph: ${pi.deliveryContactPhone}</div>` : ''}
                          </div>
                      </div>
                      <div>
                           <div style="font-weight: bold; margin-bottom: 5px;">Vendor:</div>
                           <div>${pi.vendor?.vendorName || 'N/A'}</div>
                           <div>${pi.vendor?.address || ''}</div>
                           <div>${pi.vendor?.phone || ''}</div>
                           <div>${pi.vendor?.email || ''}</div>
                           <div style="margin-top: 10px;">
                              <div class="info-item"><span class="label" style="width: 100px;">Supplier Ref:</span> ${pi.supplierInvoiceNumber || 'N/A'}</div>
                              <div class="info-item"><span class="label" style="width: 100px;">PO Number:</span> ${pi.purchaseOrder?.poNumber || 'N/A'}</div>
                           </div>
                      </div>
                  </div>
  
                  <h3>Line Items</h3>
                  <table>
                      <thead>
                          <tr>
                              <th style="width: 40px;">#</th>
                              <th>Item Description</th>
                              <th style="text-align: center; width: 60px;">Qty</th>
                              <th style="text-align: right; width: 100px;">Unit Price</th>
                              <th style="text-align: right; width: 100px;">Subtotal</th>
                              <th style="text-align: right; width: 90px;">Tax</th>
                              <th style="text-align: right; width: 110px;">Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${lineItemsHtml}
                      </tbody>
                  </table>
  
                  <div class="totals-section">
                      <table class="totals-table">
                          <tr>
                              <td>Subtotal:</td>
                              <td style="text-align: right;">${parseFloat(pi.subtotal).toFixed(2)}</td>
                          </tr>
                          ${pi.discountValue > 0 ? `
                          <tr>
                              <td>Discount:</td>
                              <td style="text-align: right; color: red;">- ${parseFloat(pi.discountValue).toFixed(2)}</td>
                          </tr>` : ''}
                          <tr>
                              <td>Tax (VAT):</td>
                              <td style="text-align: right;">${parseFloat(pi.taxAmount).toFixed(2)}</td>
                          </tr>
                          <tr class="total-row">
                              <td>Total Amount:</td>
                              <td style="text-align: right;">${parseFloat(pi.totalAmount).toFixed(2)} AED</td>
                          </tr>
                      </table>
                  </div>
  
                  ${pi.notes ? `
                  <div style="margin-top: 30px;">
                      <strong>Notes:</strong>
                      <div style="border: 1px solid #ddd; padding: 10px; min-height: 50px; margin-top: 5px;">${pi.notes}</div>
                  </div>
                  ` : ''}
  
                  <div class="footer">
                      <div>
                          <div class="signature-line">Prepared By</div>
                      </div>
                      <div>
                          <div class="signature-line">Approved By</div>
                      </div>
                  </div>
                  
                  <script>
                      window.onload = function() { window.print(); }
                  </script>
              </body>
              </html>
          `;
          
          printWindow.document.write(htmlContent);
          printWindow.document.close();
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
    <>
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
              <TableHead>Date</TableHead>
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
                  <TableCell>{parseFloat(pi.totalAmount).toFixed(2)}</TableCell>
                  <TableCell>{new Date(pi.invoiceDate).toLocaleDateString()}</TableCell>
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
    </>
  );
}
