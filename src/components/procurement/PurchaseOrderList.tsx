import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { purchaseOrdersAPI, vendorsAPI, propertiesAPI, unitsAPI, leasesAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';

import { PurchaseOrderView } from './PurchaseOrderView';

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [leaseFilter, setLeaseFilter] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
    fetchPOs();
  }, []);

  useEffect(() => {
    fetchPOs();
  }, [page, search, statusFilter, propertyFilter, unitFilter, leaseFilter]);

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

  // Refresh list when navigating back from purchase order page
  useEffect(() => {
    // Check if we're coming back from a purchase order detail page
    if (location.state?.fromPurchaseOrder || location.state?.refresh) {
      // Clear cache and refresh
      fetchPOs(true);
      // Clear the state to prevent infinite refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  const fetchPOs = async (skipCache = false) => {
    try {
      setLoading(true);
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (propertyFilter) params.propertyId = propertyFilter;
      if (unitFilter) params.unitId = unitFilter;
      if (leaseFilter) params.leaseId = leaseFilter;

      const response = await purchaseOrdersAPI.getAll(params, skipCache);
      const data = response.data?.data || {};
      setPurchaseOrders(data.purchaseOrders || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch purchase orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number, poNumber: string) => {
    if (!window.confirm(`Are you sure you want to cancel Purchase Order ${poNumber}?`)) {
      return;
    }

    try {
      await purchaseOrdersAPI.cancel(id);
      toast({
        title: 'Success',
        description: 'Purchase Order cancelled successfully',
      });
      fetchPOs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel purchase order',
        variant: 'destructive',
      });
    }
  };

  const canEdit = (status: string) => {
    return status === 'draft';
  };

  const canCancel = (status: string) => {
    return !['fully_received', 'cancelled'].includes(status);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Orders</CardTitle>
            </div>
            <Button onClick={() => navigate('/procurement/purchase-orders/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New PO
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partially_received">Partially Received</SelectItem>
                <SelectItem value="fully_received">Fully Received</SelectItem>
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
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Property/Unit</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : purchaseOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No purchase orders found</TableCell>
                </TableRow>
              ) : (
                purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono">{po.poNumber}</TableCell>
                    <TableCell>{po.vendor?.vendorName || 'N/A'}</TableCell>
                    <TableCell>
                      {po.property ? (
                        <div className="text-sm">
                          <div>{po.property.title}</div>
                          {po.unit && (
                            <div className="text-muted-foreground">Unit {po.unit.unitNumber || po.unit.unit_number}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(po.poDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{po.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {po.totalAmount != null 
                        ? (typeof po.totalAmount === 'number' 
                            ? po.totalAmount.toFixed(2) 
                            : parseFloat(po.totalAmount).toFixed(2))
                        : '0.00'} AED
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setSelectedPO(po);
                            setShowViewModal(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {canEdit(po.status) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/procurement/purchase-orders/${po.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </>
                          )}
                          {canCancel(po.status) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleCancel(po.id, po.poNumber)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </>
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

      {showViewModal && selectedPO && (
        <PurchaseOrderView
          poId={selectedPO.id}
          onClose={() => {
            setShowViewModal(false);
            setSelectedPO(null);
          }}
        />
      )}
    </>
  );
}
