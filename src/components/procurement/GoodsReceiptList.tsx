import { useState, useEffect } from 'react';
import { goodsReceiptsAPI, propertiesAPI, unitsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus } from 'lucide-react';
import { GoodsReceiptForm } from './GoodsReceiptForm';

export default function GoodsReceiptList() {
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedGR, setSelectedGR] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [deliveryPropertyFilter, setDeliveryPropertyFilter] = useState('');
  const [deliveryUnitFilter, setDeliveryUnitFilter] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
    fetchGRs();
  }, []);

  useEffect(() => {
    fetchGRs();
  }, [search, deliveryPropertyFilter, deliveryUnitFilter]);

  useEffect(() => {
    if (deliveryPropertyFilter) {
      fetchUnits(parseInt(deliveryPropertyFilter));
    } else {
      setUnits([]);
      setDeliveryUnitFilter('');
    }
  }, [deliveryPropertyFilter]);

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

  const fetchGRs = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (deliveryPropertyFilter) params.deliveryPropertyId = deliveryPropertyFilter;
      if (deliveryUnitFilter) params.deliveryUnitId = deliveryUnitFilter;

      const response = await goodsReceiptsAPI.getAll(params);
      const data = response.data?.data || {};
      setGoodsReceipts(data.goodsReceipts || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch goods receipts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Goods Receipts</CardTitle>
            </div>
            <Button onClick={() => { setSelectedGR(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New GR
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
            <SearchableSelect
              value={deliveryPropertyFilter || "all"}
              onValueChange={(value) => setDeliveryPropertyFilter(value === "all" ? "" : value)}
              placeholder="All Delivery Properties"
              searchPlaceholder="Search properties..."
              emptyMessage="No properties found"
              className="w-[200px]"
              options={[
                { value: "all", label: "All Delivery Properties" },
                ...properties.map((property) => ({
                  value: property.id.toString(),
                  label: property.title,
                })),
              ]}
            />
            <SearchableSelect
              value={deliveryUnitFilter || "all"}
              onValueChange={(value) => setDeliveryUnitFilter(value === "all" ? "" : value)}
              disabled={!deliveryPropertyFilter}
              placeholder={deliveryPropertyFilter ? "All Delivery Units" : "Select Property"}
              searchPlaceholder="Search units..."
              emptyMessage="No units found"
              className="w-[180px]"
              options={[
                { value: "all", label: "All Delivery Units" },
                ...units.map((unit) => ({
                  value: unit.id.toString(),
                  label: unit.unitNumber || unit.unit_number,
                })),
              ]}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GR Number</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Delivery Location</TableHead>
                <TableHead>Receipt Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : goodsReceipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No goods receipts found</TableCell>
                </TableRow>
              ) : (
                goodsReceipts.map((gr) => (
                  <TableRow key={gr.id}>
                    <TableCell className="font-mono">{gr.grNumber}</TableCell>
                    <TableCell>{gr.purchaseOrder?.poNumber || 'N/A'}</TableCell>
                    <TableCell>
                      {gr.deliveryProperty || gr.deliveryUnit ? (
                        <div className="text-sm">
                          {gr.deliveryProperty && <div>{gr.deliveryProperty.title}</div>}
                          {gr.deliveryUnit && (
                            <div className="text-muted-foreground">Unit {gr.deliveryUnit.unitNumber || gr.deliveryUnit.unit_number}</div>
                          )}
                          {gr.deliveryAddress && (
                            <div className="text-muted-foreground text-xs mt-1">{gr.deliveryAddress}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(gr.receiptDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{gr.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedGR(gr); setShowForm(true); }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showForm && (
        <GoodsReceiptForm
          goodsReceipt={selectedGR || undefined}
          onClose={(refresh) => {
            setShowForm(false);
            setSelectedGR(null);
            if (refresh) fetchGRs();
          }}
        />
      )}
    </>
  );
}
