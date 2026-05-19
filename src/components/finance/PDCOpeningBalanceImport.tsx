import React, { useState, useCallback, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { chequesAPI } from "@/services/api";
import api from "@/services/api";

interface TenantOption {
  id: number;
  name: string;
  email: string;
}
interface LeaseOption {
  id: number;
  leaseNumber: string;
  tenantId: number;
}

interface ParsedRow {
  _idx: number;
  tenantEmail: string;
  propertyName: string;
  unitNumber: string;
  leaseNumber: string;
  chequeNumber: string;
  bankName: string;
  amount: number;
  chequeDate: string;
  notes: string;
  tenantId: number | null;
  leaseId: number | null;
  errors: string[];
  skipped: boolean;
}

type WizardStep = "upload" | "validate" | "review" | "results";
const STEPS: WizardStep[] = ["upload", "validate", "review", "results"];
const STEP_LABELS: Record<WizardStep, string> = {
  upload: "Upload",
  validate: "Validate & Fix",
  review: "Review",
  results: "Results",
};

function getVal(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined) return row[k];
    const stripped = k.replace(/^\uFEFF/, "");
    if (stripped !== k && row[stripped] !== undefined) return row[stripped];
  }
  return undefined;
}

function parseDate(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split("T")[0];
  if (typeof v === "number" && v > 10000 && v < 100000) {
    const epoch = new Date(Math.round((v - 25569) * 86400000));
    if (!isNaN(epoch.getTime())) return epoch.toISOString().split("T")[0];
  }
  const str = String(v).trim();
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const d = new Date(str);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

interface PDCOpeningBalanceImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export default function PDCOpeningBalanceImport({
  open,
  onOpenChange,
  onImportComplete,
}: PDCOpeningBalanceImportProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [refLoading, setRefLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: { index: number; messages: string[] }[];
  } | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    if (!open) {
      setStep("upload");
      setFileName("");
      setRows([]);
      setImportResults(null);
      setPage(0);
    }
  }, [open]);

  const handleDownloadTemplate = () => {
    const template = [
      {
        "Tenant Email": "tenant@example.com",
        "Property Name": "Sample Tower",
        "Unit Number": "101",
        "Lease Number": "",
        "Cheque Number": "CHQ-001",
        "Bank Name": "Emirates NBD",
        Amount: 5000,
        "Cheque Date": "2026-06-01",
        Notes: "Opening balance PDC",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PDC Opening");
    XLSX.writeFile(wb, "pdc_opening_balance_template.xlsx");
    toast.success("Template downloaded");
  };

  const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
        const parsed: ParsedRow[] = json.map((row, i) => ({
          _idx: i,
          tenantEmail: String(getVal(row, "Tenant Email", "tenant_email") ?? "").trim(),
          propertyName: String(getVal(row, "Property Name", "property_name") ?? "").trim(),
          unitNumber: String(getVal(row, "Unit Number", "unit_number") ?? "").trim(),
          leaseNumber: String(getVal(row, "Lease Number", "lease_number") ?? "").trim(),
          chequeNumber: String(getVal(row, "Cheque Number", "cheque_number") ?? "").trim(),
          bankName: String(getVal(row, "Bank Name", "bank_name") ?? "").trim(),
          amount: parseFloat(String(getVal(row, "Amount", "amount") ?? "0").replace(/,/g, "")) || 0,
          chequeDate: parseDate(getVal(row, "Cheque Date", "cheque_date")),
          notes: String(getVal(row, "Notes", "notes") ?? "").trim(),
          tenantId: null,
          leaseId: null,
          errors: [],
          skipped: false,
        }));
        setRows(parsed);
        setFileName(file.name);
        toast.success(`Parsed ${parsed.length} rows`);
      } catch {
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, []);

  const fetchRefAndResolve = useCallback(async () => {
    setRefLoading(true);
    try {
      const [tenantRes, leaseRes] = await Promise.all([
        api.get("/tenants/options", { skipCache: true } as object),
        api.get("/leases", { params: { limit: 5000 }, skipCache: true } as object),
      ]);
      const tenantList: TenantOption[] =
        tenantRes.data?.data?.tenants || tenantRes.data?.tenants || [];
      const leaseRows = leaseRes.data?.data?.leases || leaseRes.data?.leases || [];
      const leaseList: LeaseOption[] = (Array.isArray(leaseRows) ? leaseRows : []).map(
        (l: { id: number; leaseNumber: string; tenantId: number }) => ({
          id: l.id,
          leaseNumber: l.leaseNumber,
          tenantId: l.tenantId,
        }),
      );
      setTenants(tenantList);
      const tenantByEmail = new Map<string, TenantOption>();
      for (const t of tenantList) {
        if (t.email) tenantByEmail.set(t.email.toLowerCase().trim(), t);
      }
      setRows((prev) =>
        prev.map((row) => {
          const errors: string[] = [];
          let tenantId: number | null = null;
          let leaseId: number | null = null;
          if (row.tenantEmail) {
            const t = tenantByEmail.get(row.tenantEmail.toLowerCase().trim());
            if (t) tenantId = t.id;
            else errors.push(`Tenant not found: ${row.tenantEmail}`);
          } else errors.push("Tenant Email is required");
          if (row.leaseNumber) {
            const lease = leaseList.find(
              (l) =>
                l.leaseNumber.toLowerCase() === row.leaseNumber.toLowerCase() &&
                (!tenantId || l.tenantId === tenantId),
            );
            if (lease) leaseId = lease.id;
            else errors.push(`Lease not found: ${row.leaseNumber}`);
          }
          if (!row.chequeNumber) errors.push("Cheque Number is required");
          if (!row.bankName) errors.push("Bank Name is required");
          if (!row.amount || row.amount <= 0) errors.push("Amount must be > 0");
          if (!row.chequeDate) errors.push("Cheque Date is required");
          return { ...row, tenantId, leaseId, errors };
        }),
      );
    } catch {
      toast.error("Failed to load reference data");
    } finally {
      setRefLoading(false);
    }
  }, []);

  const validRows = rows.filter((r) => !r.skipped && r.errors.length === 0);

  const handleImport = async () => {
    if (!validRows.length) {
      toast.error("No valid rows to import");
      return;
    }
    setImporting(true);
    try {
      const res = await chequesAPI.bulkOpeningImport(
        validRows.map((r) => ({
          tenantId: r.tenantId,
          leaseId: r.leaseId,
          chequeNumber: r.chequeNumber,
          bankName: r.bankName,
          amount: r.amount,
          chequeDate: r.chequeDate,
          notes: r.notes || "Opening balance PDC",
        })),
      );
      const data = res.data?.data || res.data;
      setImportResults({
        success: data?.success ?? 0,
        failed: data?.failed ?? 0,
        errors: data?.errors ?? [],
      });
      setStep("results");
      if (data?.success > 0) onImportComplete();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e.response?.data?.message || e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);
  const pagedRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);

  return (
    <Dialog open={open} onOpenChange={step === "results" ? onOpenChange : undefined}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import PDC Opening Balance</DialogTitle>
          <DialogDescription>
            Register legacy PDCs already received (no GL on import). Set PDC account debit in
            Chart of Accounts → Opening Balances. Deposit posts Dr Bank / Cr PDC.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator step={step} stepIndex={stepIndex} />

        <div className="flex-1 overflow-auto min-h-0">
          {step === "upload" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download template
              </Button>
              <UploadStep
                fileName={fileName}
                rows={rows}
                fileInputRef={fileInputRef}
                onPick={handleFilePick}
              />
            </div>
          )}
          {step === "validate" &&
            (refLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : (
              <ValidateStep
                pagedRows={pagedRows}
                tenants={tenants}
                setRows={setRows}
                page={page}
                totalPages={totalPages}
                setPage={setPage}
              />
            ))}
          {step === "review" && (
            <div className="py-4">
              <p className="text-sm">
                <strong>{validRows.length}</strong> cheque(s) ready to import (no GL).
              </p>
            </div>
          )}
          {step === "results" && importResults && <ResultsStep importResults={importResults} />}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={rows.length === 0}
                onClick={() => {
                  setStep("validate");
                  setPage(0);
                  fetchRefAndResolve();
                }}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === "validate" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button disabled={validRows.length === 0} onClick={() => setStep("review")}>
                Review ({validRows.length})
              </Button>
            </>
          )}
          {step === "review" && (
            <>
              <Button variant="outline" onClick={() => setStep("validate")} disabled={importing}>
                Back
              </Button>
              <Button disabled={validRows.length === 0 || importing} onClick={handleImport}>
                {importing ? "Importing..." : `Import ${validRows.length} PDC(s)`}
              </Button>
            </>
          )}
          {step === "results" && <Button onClick={() => onOpenChange(false)}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepIndicator({ step, stepIndex }: { step: WizardStep; stepIndex: number }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b flex-wrap">
      {STEPS.map((s, i) => (
        <span
          key={s}
          className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-md border",
            step === s
              ? "bg-primary text-primary-foreground border-primary"
              : i < stepIndex
                ? "bg-muted/80 text-muted-foreground border-transparent"
                : "bg-background text-muted-foreground border-border",
          )}
        >
          {i + 1}. {STEP_LABELS[s]}
        </span>
      ))}
    </div>
  );
}

function UploadStep({
  fileName,
  rows,
  fileInputRef,
  onPick,
}: {
  fileName: string;
  rows: ParsedRow[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="border-2 border-dashed rounded-lg p-8 text-center w-full max-w-md">
      <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      {fileName ? (
        <p className="font-medium">
          {fileName} — {rows.length} rows
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Upload .xlsx or .xls</p>
      )}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onPick} />
      <Button variant="outline" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        Select file
      </Button>
    </div>
  );
}

function ValidateStep({
  pagedRows,
  tenants,
  setRows,
  page,
  totalPages,
  setPage,
}: {
  pagedRows: ParsedRow[];
  tenants: TenantOption[];
  setRows: React.Dispatch<React.SetStateAction<ParsedRow[]>>;
  page: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <>
      <ScrollArea className="h-[360px] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Cheque</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.map((row) => (
              <TableRow key={row._idx} className={row.errors.length ? "bg-destructive/5" : ""}>
                <TableCell>{row._idx + 2}</TableCell>
                <TableCell>
                  {row.errors.length ? (
                    <Badge variant="destructive">Error</Badge>
                  ) : (
                    <Badge className="bg-green-600">Valid</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs max-w-[180px]">
                  {row.tenantId ? (
                    tenants.find((t) => t.id === row.tenantId)?.name || row.tenantEmail
                  ) : (
                    <Select
                      value=""
                      onValueChange={(val) => {
                        setRows((prev) => {
                          const u = [...prev];
                          u[row._idx] = {
                            ...u[row._idx],
                            tenantId: parseInt(val, 10),
                            errors: u[row._idx].errors.filter((e) => !e.startsWith("Tenant")),
                          };
                          return u;
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder={row.tenantEmail || "Select tenant"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                            {t.name} ({t.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {row.errors.length > 0 && (
                    <p className="text-destructive text-[10px] mt-1">{row.errors.join("; ")}</p>
                  )}
                </TableCell>
                <TableCell className="text-xs">{row.chequeNumber}</TableCell>
                <TableCell className="text-xs">{row.bankName}</TableCell>
                <TableCell className="text-xs">{row.amount}</TableCell>
                <TableCell className="text-xs">{row.chequeDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      {totalPages > 1 && (
        <div className="flex justify-between mt-2 text-sm">
          <span>
            Page {page + 1} / {totalPages}
          </span>
          <ValidatePager page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}
    </>
  );
}

function ValidatePager({
  page,
  totalPages,
  setPage,
}: {
  page: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
        Prev
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= totalPages - 1}
        onClick={() => setPage((p) => p + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function ResultsStep({
  importResults,
}: {
  importResults: { success: number; failed: number; errors: { index: number; messages: string[] }[] };
}) {
  return (
    <div className="grid grid-cols-2 gap-4 py-4">
      <div className="border rounded-lg p-4 text-center">
        <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-2" />
        <p className="text-2xl font-bold">{importResults.success}</p>
        <p className="text-sm text-muted-foreground">Imported</p>
      </div>
      <ImportFailedSummary importResults={importResults} />
    </div>
  );
}

function ImportFailedSummary({
  importResults,
}: {
  importResults: { success: number; failed: number; errors: { index: number; messages: string[] }[] };
}) {
  return (
    <div className="border rounded-lg p-4 text-center">
      <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
      <p className="text-2xl font-bold">{importResults.failed}</p>
      <p className="text-sm text-muted-foreground">Failed</p>
    </div>
  );
}
