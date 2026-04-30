import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, RefreshCw, Upload } from "lucide-react";
import { vendorInvoicesAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatGlSummary(entries: any[] | undefined): string {
  if (!entries?.length) return "—";
  return entries
    .map((e) => {
      const code = e.ledger?.accountCode || "";
      const name = e.ledger?.accountName || "";
      const dr = parseFloat(e.debitAmount || 0);
      const cr = parseFloat(e.creditAmount || 0);
      if (!code && !name && !dr && !cr) return "";
      return `${code} ${name}`.trim() + (dr ? ` Dr:${dr}` : "") + (cr ? ` Cr:${cr}` : "");
    })
    .filter(Boolean)
    .join(" | ") || "—";
}

export default function SupplierOpenInvoices() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await vendorInvoicesAPI.getAll({
        openOnly: true,
        includeGl: true,
        limit: 500,
        search: search.trim() || undefined,
        sortBy: "due_date",
        sortOrder: "ASC",
      });
      const list = data?.data?.invoices ?? data?.invoices ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to load supplier invoices");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const saveBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await vendorInvoicesAPI.downloadTemplate();
      saveBlob(res.data as Blob, "vendor_invoice_import_template.xlsx");
      toast.success("Template downloaded");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Template download failed");
    }
  };

  const handleExport = async () => {
    try {
      const res = await vendorInvoicesAPI.export({
        openOnly: true,
        includeGl: true,
        search: search.trim() || undefined,
      });
      saveBlob(res.data as Blob, "supplier_open_invoices_export.xlsx");
      toast.success("Export downloaded");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Export failed");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await vendorInvoicesAPI.import(fd);
      const errs = res.data?.data?.errors?.length ?? 0;
      toast.success(res.data?.message || "Import complete", {
        description: errs ? `${errs} row(s) skipped — see API response` : undefined,
      });
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Import failed");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6 uiux-page-enter">
      <div className="uiux-page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="uiux-page-title">Supplier open invoices</h1>
          <p className="uiux-page-subtitle">
            Unpaid vendor bills with optional GL lines from posted journals (same filters as export).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import template
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <Button type="button" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search invoice number or description, then refresh.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            className="max-w-sm"
          />
          <Button type="button" variant="secondary" onClick={() => load()}>
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>GL / ledger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No open supplier invoices.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.vendor?.vendorName ?? "—"}</TableCell>
                      <TableCell>
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-AE") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(inv.totalAmount || 0).toLocaleString("en-AE", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{inv.paymentStatus ?? "—"}</TableCell>
                      <TableCell className="max-w-md whitespace-normal text-sm">
                        {formatGlSummary(inv.accountingEntries)}
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
