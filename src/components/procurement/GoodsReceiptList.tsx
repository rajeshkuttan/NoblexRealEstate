import { useState, useEffect } from 'react';
import { goodsReceiptsAPI, itemsAPI } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus, MoreHorizontal } from 'lucide-react';
import { GoodsReceiptForm } from './GoodsReceiptForm';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSettings } from '@/contexts/SettingsContext';
import { resolveImageUrl } from '@/lib/utils';
import { ListPagination } from '@/components/common/ListPagination';

export default function GoodsReceiptList() {
  const [goodsReceipts, setGoodsReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedGR, setSelectedGR] = useState<any>(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [search, setSearch] = useState('');
  const [deliveryPropertyFilter, setDeliveryPropertyFilter] = useState('');
  const [deliveryUnitFilter, setDeliveryUnitFilter] = useState('');
  const [grnProperties, setGrnProperties] = useState<any[]>([]);
  const [grnUnits, setGrnUnits] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();
  const { companyLogoPath, companyName } = useSettings();

  useEffect(() => {
    fetchFilterOptions();
    fetchGRs();
  }, []);

  useEffect(() => {
    fetchGRs();
  }, [page, itemsPerPage, search, deliveryPropertyFilter, deliveryUnitFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, deliveryPropertyFilter, deliveryUnitFilter, itemsPerPage]);

  useEffect(() => {
    if (!deliveryPropertyFilter) {
      setDeliveryUnitFilter('');
    }
  }, [deliveryPropertyFilter]);

  const handlePrint = async (id: number) => {
    try {
        const response = await goodsReceiptsAPI.getById(id);
        const gr = response.data?.data?.goodsReceipt || response.data;
        
        if (!gr) return;

        let lineItemsHtml = '';
        let items = gr.lineItems || [];
        const itemsRes = await itemsAPI.getAll();
        const allItemsList = itemsRes.data?.data?.items || itemsRes.data?.data || [];
        const companyLogoUrl = companyLogoPath ? resolveImageUrl(companyLogoPath) : '';

        items.forEach((item: any, index: number) => {
            const resolvedItem = allItemsList.find((i: any) => i.id === parseInt(item.item_id));
            const itemName = resolvedItem?.itemName || item.item?.itemName || item.itemName || 'Unknown Item';
            const itemCode = resolvedItem?.itemCode || item.item?.itemCode || item.itemCode || '';
            const qty = item.quantity || item.received_qty || 0;
            
            lineItemsHtml += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${itemName}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${itemCode}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${qty}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description || ''}</td>
                </tr>
            `;
        });

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Goods Receipt Note - ${gr.grNumber}</title>
                <style>
                    @media print {
                        @page { size: A4; margin: 0.5in; }
                        body { margin: 0; }
                    }
                    html, body { height: 100%; }
                    body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #111827; }
                    .page { min-height: calc(100vh - 1in); display: flex; flex-direction: column; padding: 0.5in; box-sizing: border-box; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
                    .header-left { display: flex; flex-direction: column; gap: 8px; }
                    .title { font-size: 24px; font-weight: bold; text-decoration: underline; }
                    .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
                    .company-logo { max-width: 150px; max-height: 70px; object-fit: contain; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .info-item { margin-bottom: 5px; }
                    .label { font-weight: bold; width: 120px; display: inline-block; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { text-align: left; background-color: #f5f5f5; padding: 10px; border-bottom: 2px solid #ddd; }
                    .content { flex: 1; }
                    .footer { margin-top: auto; padding-top: 48px; display: flex; justify-content: space-between; }
                    .signature-line { border-top: 1px solid #000; width: 200px; padding-top: 5px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="page">
                <div class="header">
                    <div class="header-left">
                        <div class="title">GOODS RECEIPT NOTE</div>
                        <div>${companyName || ''}</div>
                    </div>
                    <div class="header-right">
                        ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="${companyName || 'Company logo'}" class="company-logo" />` : ''}
                        <div>
                            <div class="info-item"><span class="label">Date:</span> ${new Date(gr.receiptDate).toLocaleDateString()}</div>
                            <div class="info-item"><span class="label">GR Number:</span> ${gr.grNumber}</div>
                            <div class="info-item"><span class="label">PO Number:</span> ${gr.purchaseOrder?.poNumber || 'N/A'}</div>
                        </div>
                    </div>
                </div>

                <div class="content">
                <div class="info-grid">
                    <div>
                        <div style="font-weight: bold; margin-bottom: 5px;">Delivery To:</div>
                        ${gr.deliveryProperty ? `<div>${gr.deliveryProperty.title}</div>` : ''}
                        ${gr.deliveryUnit ? `<div>Unit: ${gr.deliveryUnit.unitNumber}</div>` : ''}
                        ${gr.deliveryAddress ? `<div>${gr.deliveryAddress}</div>` : ''}
                        <div style="margin-top: 10px;">
                            ${gr.deliveryContactName ? `<div>Attn: ${gr.deliveryContactName}</div>` : ''}
                            ${gr.deliveryContactPhone ? `<div>Ph: ${gr.deliveryContactPhone}</div>` : ''}
                        </div>
                    </div>
                    <div>
                         <div style="font-weight: bold; margin-bottom: 5px;">Vendor:</div>
                         <div>${gr.purchaseOrder?.vendor?.vendorName || 'N/A'}</div>
                    </div>
                </div>

                <h3>Received Items</h3>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th>Item Name</th>
                            <th>Item Code</th>
                            <th style="text-align: center; width: 80px;">Qty</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lineItemsHtml}
                    </tbody>
                </table>

                ${gr.notes ? `
                <div style="margin-bottom: 30px;">
                    <strong>Notes:</strong>
                    <div style="border: 1px solid #ddd; padding: 10px; min-height: 50px;">${gr.notes}</div>
                </div>
                ` : ''}
                </div>

                <div class="footer">
                    <div>
                        <div class="signature-line">Received By</div>
                    </div>
                    <div>
                        <div class="signature-line">Authorized Signature</div>
                    </div>
                </div>
                
                <script>
                    window.addEventListener('afterprint', function() {
                      window.close();
                    });

                    window.onload = function() {
                      window.focus();
                      window.print();
                    };
                </script>
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const printUrl = URL.createObjectURL(blob);
        const printWindow = window.open(printUrl, '_blank', 'noopener,noreferrer');

        if (!printWindow) {
          URL.revokeObjectURL(printUrl);
          toast({ title: 'Error', description: 'Popup blocked while opening print preview', variant: 'destructive' });
          return;
        }

        const revokeUrl = () => URL.revokeObjectURL(printUrl);
        printWindow.addEventListener('beforeunload', revokeUrl, { once: true });
        window.setTimeout(revokeUrl, 60000);
    } catch (error) {
        console.error('Print error:', error);
        toast({ title: 'Error', description: 'Failed to generate print view', variant: 'destructive' });
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await goodsReceiptsAPI.getAll({ limit: 500 }, true);
      const data = response.data?.data || {};
      const allGoodsReceipts = Array.isArray(data.goodsReceipts) ? data.goodsReceipts : [];

      const propertiesMap = new Map<string, any>();
      const unitsMap = new Map<string, any>();

      allGoodsReceipts.forEach((gr: any) => {
        if (gr.deliveryProperty?.id) {
          propertiesMap.set(String(gr.deliveryProperty.id), gr.deliveryProperty);
        }

        if (gr.deliveryUnit?.id) {
          unitsMap.set(String(gr.deliveryUnit.id), {
            ...gr.deliveryUnit,
            propertyId: gr.deliveryProperty?.id || gr.deliveryUnit?.propertyId || null,
          });
        }
      });

      setGrnProperties(Array.from(propertiesMap.values()));
      setGrnUnits(Array.from(unitsMap.values()));
    } catch (error) {
      console.error('Failed to fetch GRN filter options:', error);
      setGrnProperties([]);
      setGrnUnits([]);
    }
  };

  const filteredUnits = grnUnits.filter((unit) => {
    if (!deliveryPropertyFilter) return true;
    return String(unit.propertyId || '') === deliveryPropertyFilter;
  });

  const fetchGRs = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: itemsPerPage };
      if (search) params.search = search;
      if (deliveryPropertyFilter) params.deliveryPropertyId = deliveryPropertyFilter;
      if (deliveryUnitFilter) params.deliveryUnitId = deliveryUnitFilter;

      const response = await goodsReceiptsAPI.getAll(params, true);
      const data = response.data?.data || {};
      const pagination = data.pagination || response.data?.pagination || {};
      setGoodsReceipts(data.goodsReceipts || []);
      setTotalItems(Number(pagination.total ?? pagination.totalItems ?? 0));
      setTotalPages(Math.max(1, Number(pagination.pages ?? pagination.totalPages ?? 1)));
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
            <Button onClick={() => { setSelectedGR(null); setIsReadOnlyView(false); setShowForm(true); }}>
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
                ...grnProperties.map((property) => ({
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
                ...filteredUnits.map((unit) => ({
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
                            <div className="text-muted-foreground text-xs mt-1">{gr.deliveryAddress || ''}</div>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => { setSelectedGR(gr); setIsReadOnlyView(true); setShowForm(true); }}>
                             View
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => { setSelectedGR(gr); setIsReadOnlyView(false); setShowForm(true); }}>
                             Edit
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handlePrint(gr.id)}>
                             Print
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <ListPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            itemLabel="goods receipts"
            onPageChange={setPage}
            onItemsPerPageChange={setItemsPerPage}
            disabled={loading}
          />
        </CardContent>
      </Card>

      {showForm && (
        <GoodsReceiptForm
          goodsReceipt={selectedGR || undefined}
          readOnly={isReadOnlyView}
          onClose={(refresh) => {
            setShowForm(false);
            setSelectedGR(null);
            setIsReadOnlyView(false);
            if (refresh) {
              fetchGRs();
              fetchFilterOptions();
            }
          }}
        />
      )}
    </>
  );
}
