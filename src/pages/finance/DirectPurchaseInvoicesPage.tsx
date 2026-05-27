import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { directPurchaseInvoicesAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Printer, RefreshCw, Eye, Pencil } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import {
  generateDirectPurchaseInvoiceHtml,
  printDocument,
  defaultCompanyBranding,
} from "@/utils/printUtils";

export default function DirectPurchaseInvoicesPage() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await directPurchaseInvoicesAPI.getAll({ limit: 50 });
      setRows(res.data?.data ?? []);
    } catch {
      toast.error("Failed to load direct purchase invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const companyInfo = {
    name: activeCompany?.company_name || defaultCompanyBranding.name,
    address: defaultCompanyBranding.address,
    phone: defaultCompanyBranding.phone,
    email: defaultCompanyBranding.email,
    vatNumber: activeCompany?.vat_number || defaultCompanyBranding.vatNumber,
  };

  const handlePrint = async (id: number) => {
    try {
      const res = await directPurchaseInvoicesAPI.getById(id);
      const inv = res.data?.data;
      if (!inv) throw new Error("Not found");
      const html = generateDirectPurchaseInvoiceHtml({ ...inv, companyInfo });
      printDocument(`DPI - ${inv.dpiNumber}`, html);
    } catch {
      toast.error("Failed to generate print view");
    }
  };

  const postInvoice = async (id: number) => {
    try {
      await directPurchaseInvoicesAPI.post(id);
      toast.success("Posted to ledger");
      await load();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Post failed"
      );
    }
  };

  const cancelInvoice = async (id: number) => {
    try {
      await directPurchaseInvoicesAPI.cancel(id);
      toast.success("Cancelled");
      await load();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Cancel failed"
      );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Direct Purchase Invoices</h1>
          <p className="text-muted-foreground text-sm">
            Book expenses and input VAT directly to vendor payable (no PO/GRN).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => navigate("/finance/direct-purchase-invoices/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New DPI
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No direct purchase invoices yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.dpiNumber}</TableCell>
                      <TableCell>{r.vendor?.vendorName ?? r.vendorId}</TableCell>
                      <TableCell>{String(r.invoiceDate).slice(0, 10)}</TableCell>
                      <TableCell>{Number(r.totalAmount).toFixed(2)}</TableCell>
                      <TableCell>{Number(r.outstandingAmount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "DRAFT" ? "secondary" : "default"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Print"
                          onClick={() => handlePrint(r.id)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {r.status === "DRAFT" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(`/finance/direct-purchase-invoices/${r.id}`)
                              }
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button size="sm" onClick={() => postInvoice(r.id)}>
                              Post
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/finance/direct-purchase-invoices/${r.id}?mode=view`
                              )
                            }
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        {r.status !== "CANCELLED" && r.status !== "DRAFT" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelInvoice(r.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
