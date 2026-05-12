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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { leasesAPI, tenantsAPI } from "@/services/api";
import api from "@/services/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyOption {
  id: number;
  title: string;
  location?: string;
}
interface TenantOption {
  id: number;
  name: string;
  email: string;
}
interface UnitOption {
  id: number;
  unitNumber: string;
  propertyId: number;
}

interface ParsedRow {
  _idx: number;
  tenantEmail: string;
  propertyName: string;
  unitNumber: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  paymentFrequency: string;
  paymentDay: number;
  status: string;
  leaseNumber: string;
  leaseType: string;
  notes: string;
  renewalTerms: string;
  gracePeriod: number;
  lateFee: number;
  terminationNotice: number;
  // resolved IDs
  tenantId: number | null;
  unitId: number | null;
  propertyId: number | null;
  // validation
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

const EXPECTED_COLUMNS = [
  "Tenant Email",
  "Property Name",
  "Unit Number",
  "Start Date",
  "End Date",
  "Monthly Rent (AED)",
  "Security Deposit (AED)",
  "Payment Frequency",
  "Payment Day",
  "Status",
  "Lease Number",
  "Lease Type",
  "Notes / Observations",
  "Renewal Terms",
  "Grace Period Days",
  "Late Fee (AED)",
  "Termination Notice (Days)",
];

const VALID_STATUSES = ["active", "draft", "expired", "terminated", "renewed"];
const VALID_FREQUENCIES = ["monthly", "quarterly", "semi-annually", "annually"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getVal(row: any, ...keys: string[]): any {
  for (const k of keys) {
    if (row[k] !== undefined) return row[k];
    const stripped = k.replace(/^\uFEFF/, "");
    if (stripped !== k && row[stripped] !== undefined) return row[stripped];
    const bomKey = "\uFEFF" + k;
    if (row[bomKey] !== undefined) return row[bomKey];
  }
  return undefined;
}

function parseDate(v: any): string {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v.getTime()))
    return v.toISOString().split("T")[0];
  if (typeof v === "number" && v > 10000 && v < 100000) {
    const epoch = new Date(Math.round((v - 25569) * 86400000));
    if (!isNaN(epoch.getTime())) return epoch.toISOString().split("T")[0];
  }
  const str = String(v).trim();
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const slashMatch = str.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashMatch) return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
  const d = new Date(str);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

function cleanNum(v: any): number {
  return parseFloat(String(v == null ? "0" : v).replace(/,/g, "")) || 0;
}

function normFreq(v: any): string {
  const s = String(v || "monthly")
    .toLowerCase()
    .replace(/\s+/g, "");
  if (s === "quarterly") return "quarterly";
  if (s === "semi-annually" || s === "semiannually") return "semi-annually";
  if (s === "annually" || s === "annual" || s === "yearly") return "annually";
  return "monthly";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LeaseImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export default function LeaseImportWizard({
  open,
  onOpenChange,
  onImportComplete,
}: LeaseImportWizardProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // reference data
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [refLoading, setRefLoading] = useState(false);

  // parsed data
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [missingCols, setMissingCols] = useState<string[]>([]);

  // import results
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: { index: number; messages: string[] }[];
  } | null>(null);

  // pagination for validate table
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("upload");
      setFileName("");
      setRows([]);
      setMissingCols([]);
      setImportResults(null);
      setImporting(false);
      setImportProgress(0);
      setPage(0);
    }
  }, [open]);

  // ------ Step 1: Upload ------

  const handleFilePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (![".xlsx", ".xls"].includes(ext)) {
        toast.error("Please upload an Excel file (.xlsx or .xls)");
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json: any[] = XLSX.utils.sheet_to_json(sheet);

          if (!json.length) {
            toast.error("The Excel file is empty");
            return;
          }

          const fileHeaders = Object.keys(json[0]).map((k) =>
            k.replace(/^\uFEFF/, "")
          );
          const required = [
            "Tenant Email",
            "Property Name",
            "Unit Number",
            "Start Date",
            "End Date",
            "Monthly Rent (AED)",
          ];
          const missing = required.filter(
            (c) =>
              !fileHeaders.some(
                (h) => h.toLowerCase() === c.toLowerCase()
              )
          );

          setMissingCols(missing);

          const parsed: ParsedRow[] = json.map((row, i) => ({
            _idx: i,
            tenantEmail: String(
              getVal(row, "Tenant Email", "tenant_email") ?? ""
            ).trim(),
            propertyName: String(
              getVal(row, "Property Name", "property_name") ?? ""
            ).trim(),
            unitNumber: String(
              getVal(row, "Unit Number", "unit_number") ?? ""
            ).trim(),
            startDate: parseDate(getVal(row, "Start Date", "start_date")),
            endDate: parseDate(getVal(row, "End Date", "end_date")),
            rentAmount: cleanNum(
              getVal(
                row,
                "Monthly Rent (AED)",
                "Monthly Rent",
                "monthly_rent"
              )
            ),
            depositAmount: cleanNum(
              getVal(
                row,
                "Security Deposit (AED)",
                "Security Deposit",
                "deposit"
              )
            ),
            paymentFrequency: normFreq(
              getVal(row, "Payment Frequency", "payment_frequency")
            ),
            paymentDay:
              parseInt(
                String(getVal(row, "Payment Day", "payment_day") ?? "1")
              ) || 1,
            status: (() => {
              const s = String(
                getVal(row, "Status", "status") ?? "draft"
              ).toLowerCase();
              const mapped = s === "approved" ? "active" : s;
              return VALID_STATUSES.includes(mapped) ? mapped : "draft";
            })(),
            leaseNumber: String(
              getVal(row, "Lease Number", "lease_number") ?? ""
            ).trim(),
            leaseType: String(
              getVal(row, "Lease Type", "lease_type") ?? "residential"
            )
              .toLowerCase()
              .includes("commercial")
              ? "commercial"
              : "residential",
            notes: String(
              getVal(
                row,
                "Notes / Observations",
                "Notes",
                "notes"
              ) ?? ""
            ),
            renewalTerms: String(
              getVal(row, "Renewal Terms", "renewal_terms") ?? ""
            ),
            gracePeriod:
              parseInt(
                String(
                  getVal(row, "Grace Period Days", "grace_period") ?? "0"
                )
              ) || 0,
            lateFee: cleanNum(
              getVal(row, "Late Fee (AED)", "late_fee")
            ),
            terminationNotice:
              parseInt(
                String(
                  getVal(
                    row,
                    "Termination Notice (Days)",
                    "termination_notice"
                  ) ?? "60"
                )
              ) || 60,
            tenantId: null,
            unitId: null,
            propertyId: null,
            errors: [],
            skipped: false,
          }));

          setRows(parsed);
          setFileName(file.name);

          if (missing.length) {
            toast.warning(
              `Missing columns: ${missing.join(", ")}. Some rows may have errors.`
            );
          } else {
            toast.success(`Parsed ${parsed.length} rows from ${file.name}`);
          }
        } catch (err) {
          console.error(err);
          toast.error("Failed to parse Excel file");
        }
      };
      reader.readAsArrayBuffer(file);
      e.target.value = "";
    },
    []
  );

  // ------ Fetch reference data & resolve ------

  const fetchRefAndResolve = useCallback(async () => {
    setRefLoading(true);
    try {
      const [propRes, tenantRes, unitRes] = await Promise.all([
        api.get("/units/property-options", { skipCache: true } as any),
        api.get("/tenants/options", { skipCache: true } as any),
        api.get("/units/unit-options", { skipCache: true } as any),
      ]);

      const propList: PropertyOption[] =
        propRes.data?.data?.properties || propRes.data?.properties || [];
      const tenantList: TenantOption[] =
        tenantRes.data?.data?.tenants || tenantRes.data?.tenants || [];
      const unitList: UnitOption[] =
        unitRes.data?.data?.units || unitRes.data?.units || [];

      setProperties(propList);
      setTenants(tenantList);
      setUnits(unitList);

      // build lookup maps
      const propByLower = new Map<string, PropertyOption>();
      for (const p of propList) {
        propByLower.set(String(p.title || "").toLowerCase().trim(), p);
      }

      const tenantByEmail = new Map<string, TenantOption>();
      for (const t of tenantList) {
        if (t.email)
          tenantByEmail.set(String(t.email).toLowerCase().trim(), t);
      }

      const unitByKey = new Map<string, UnitOption>();
      for (const u of unitList) {
        const key = `${u.propertyId}_${String(u.unitNumber || "")
          .toLowerCase()
          .trim()}`;
        unitByKey.set(key, u);
      }

      setRows((prev) =>
        prev.map((row) => {
          const errors: string[] = [];

          // resolve tenant
          let tenantId: number | null = null;
          if (row.tenantEmail) {
            const t = tenantByEmail.get(row.tenantEmail.toLowerCase().trim());
            if (t) tenantId = t.id;
            else errors.push(`Tenant not found: ${row.tenantEmail}`);
          } else {
            errors.push("Tenant Email is required");
          }

          // resolve property
          let propertyId: number | null = null;
          if (row.propertyName) {
            const pKey = row.propertyName.toLowerCase().trim();
            let p = propByLower.get(pKey);
            if (!p) {
              for (const [key, val] of propByLower) {
                if (key.includes(pKey) || pKey.includes(key)) {
                  p = val;
                  break;
                }
              }
            }
            if (p) propertyId = p.id;
            else errors.push(`Property not found: ${row.propertyName}`);
          } else {
            errors.push("Property Name is required");
          }

          // resolve unit
          let unitId: number | null = null;
          if (propertyId && row.unitNumber) {
            const uKey = `${propertyId}_${row.unitNumber.toLowerCase().trim()}`;
            const u = unitByKey.get(uKey);
            if (u) unitId = u.id;
            else
              errors.push(
                `Unit "${row.unitNumber}" not found in property`
              );
          } else if (!row.unitNumber) {
            errors.push("Unit Number is required");
          }

          // field validations
          if (!row.startDate) errors.push("Start Date is required");
          if (!row.endDate) errors.push("End Date is required");
          if (
            row.startDate &&
            row.endDate &&
            new Date(row.startDate) > new Date(row.endDate)
          )
            errors.push("Start Date must be before End Date");
          if (!row.rentAmount || row.rentAmount <= 0)
            errors.push("Monthly Rent must be > 0");

          return {
            ...row,
            tenantId,
            propertyId,
            unitId,
            errors,
          };
        })
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reference data");
    } finally {
      setRefLoading(false);
    }
  }, []);

  const handleGoToValidate = useCallback(() => {
    setStep("validate");
    setPage(0);
    fetchRefAndResolve();
  }, [fetchRefAndResolve]);

  // ------ Row editing ------

  const updateRow = useCallback(
    (idx: number, changes: Partial<ParsedRow>) => {
      setRows((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...changes };
        return updated;
      });
    },
    []
  );

  const reResolveRow = useCallback(
    (idx: number) => {
      setRows((prev) => {
        const updated = [...prev];
        const row = { ...updated[idx] };
        const errors: string[] = [];

        // tenant
        if (row.tenantId) {
          // manually selected — keep it
        } else if (row.tenantEmail) {
          const t = tenants.find(
            (t) =>
              t.email.toLowerCase().trim() ===
              row.tenantEmail.toLowerCase().trim()
          );
          if (t) row.tenantId = t.id;
          else errors.push(`Tenant not found: ${row.tenantEmail}`);
        } else {
          errors.push("Tenant Email is required");
        }

        // property
        if (row.propertyId) {
          // manually selected — keep it
        } else if (row.propertyName) {
          const pKey = row.propertyName.toLowerCase().trim();
          const p =
            properties.find(
              (p) => p.title.toLowerCase().trim() === pKey
            ) ||
            properties.find(
              (p) =>
                p.title.toLowerCase().trim().includes(pKey) ||
                pKey.includes(p.title.toLowerCase().trim())
            );
          if (p) row.propertyId = p.id;
          else errors.push(`Property not found: ${row.propertyName}`);
        } else {
          errors.push("Property Name is required");
        }

        // unit
        if (row.unitId) {
          // manually selected — keep
        } else if (row.propertyId && row.unitNumber) {
          const u = units.find(
            (u) =>
              u.propertyId === row.propertyId &&
              u.unitNumber.toLowerCase().trim() ===
                row.unitNumber.toLowerCase().trim()
          );
          if (u) row.unitId = u.id;
          else
            errors.push(
              `Unit "${row.unitNumber}" not found in property`
            );
        } else if (!row.unitNumber) {
          errors.push("Unit Number is required");
        }

        if (!row.startDate) errors.push("Start Date is required");
        if (!row.endDate) errors.push("End Date is required");
        if (
          row.startDate &&
          row.endDate &&
          new Date(row.startDate) > new Date(row.endDate)
        )
          errors.push("Start Date must be before End Date");
        if (!row.rentAmount || row.rentAmount <= 0)
          errors.push("Monthly Rent must be > 0");

        row.errors = errors;
        updated[idx] = row;
        return updated;
      });
    },
    [properties, tenants, units]
  );

  const toggleSkip = useCallback((idx: number) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], skipped: !updated[idx].skipped };
      return updated;
    });
  }, []);

  // ------ Step 3: Import ------

  const validRows = rows.filter((r) => !r.skipped && r.errors.length === 0);
  const invalidRows = rows.filter((r) => !r.skipped && r.errors.length > 0);
  const skippedRows = rows.filter((r) => r.skipped);

  const handleImport = useCallback(async () => {
    if (!validRows.length) {
      toast.error("No valid rows to import");
      return;
    }
    setImporting(true);
    setImportProgress(10);

    try {
      const payload = validRows.map((r) => ({
        tenantId: r.tenantId,
        unitId: r.unitId,
        startDate: r.startDate,
        endDate: r.endDate,
        rentAmount: r.rentAmount,
        depositAmount: r.depositAmount,
        paymentFrequency: r.paymentFrequency,
        paymentDay: r.paymentDay,
        status: r.status,
        leaseNumber: r.leaseNumber || undefined,
        leaseType: r.leaseType,
        terms: r.notes || undefined,
        renewalTerms: r.renewalTerms || undefined,
        gracePeriod: r.gracePeriod,
        lateFee: r.lateFee,
        terminationNotice: r.terminationNotice,
      }));

      setImportProgress(30);
      const res = await leasesAPI.bulkCreate(payload);
      setImportProgress(100);

      const data = res.data?.data || res.data;
      setImportResults({
        success: data?.success ?? 0,
        failed: data?.failed ?? 0,
        errors: data?.errors ?? [],
      });
      setStep("results");

      if (data?.success > 0) {
        onImportComplete();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Import failed — see console"
      );
      setImportResults({
        success: 0,
        failed: validRows.length,
        errors: [
          {
            index: -1,
            messages: [
              err.response?.data?.message || err.message || "Unknown error",
            ],
          },
        ],
      });
      setStep("results");
    } finally {
      setImporting(false);
    }
  }, [validRows, onImportComplete]);

  // ------ Render helpers ------

  const stepIndex = STEPS.indexOf(step);

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b">
      {STEPS.map((s, i) => (
        <span
          key={s}
          className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-md border transition-colors",
            step === s
              ? "bg-primary text-primary-foreground border-primary"
              : i < stepIndex
                ? "bg-muted/80 text-muted-foreground border-transparent"
                : "bg-background text-muted-foreground border-border"
          )}
        >
          {i + 1}. {STEP_LABELS[s]}
        </span>
      ))}
    </div>
  );

  // ---------- Step 1 ----------

  const renderUpload = () => (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <div className="border-2 border-dashed rounded-lg p-10 text-center w-full max-w-md hover:border-primary/50 transition-colors">
        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        {fileName ? (
          <>
            <p className="font-medium">{fileName}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {rows.length} row{rows.length !== 1 ? "s" : ""} detected
            </p>
            {missingCols.length > 0 && (
              <div className="mt-3 text-sm text-destructive">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                Missing: {missingCols.join(", ")}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="font-medium">Drop your Excel file or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports .xlsx and .xls
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFilePick}
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {fileName ? "Choose different file" : "Select file"}
        </Button>
      </div>

      {rows.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Expected columns:</strong>
          </p>
          <p className="mt-1">{EXPECTED_COLUMNS.join(", ")}</p>
        </div>
      )}
    </div>
  );

  // ---------- Step 2 ----------

  const pagedRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);

  const renderValidate = () => {
    if (refLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">
            Loading properties, tenants, and units...
          </p>
        </div>
      );
    }

    const propUnits = (propertyId: number | null) =>
      propertyId ? units.filter((u) => u.propertyId === propertyId) : units;

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {validRows.length} valid
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-destructive" />
            {invalidRows.length} with errors
          </span>
          <span className="flex items-center gap-1">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            {skippedRows.length} skipped
          </span>
        </div>

        <ScrollArea className="h-[420px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="min-w-[180px]">Tenant</TableHead>
                <TableHead className="min-w-[160px]">Property</TableHead>
                <TableHead className="min-w-[120px]">Unit</TableHead>
                <TableHead className="w-[110px]">Start Date</TableHead>
                <TableHead className="w-[110px]">End Date</TableHead>
                <TableHead className="w-[110px]">Rent (AED)</TableHead>
                <TableHead className="w-[90px]">Lease Status</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((row) => {
                const hasErrors = row.errors.length > 0;
                const isSkipped = row.skipped;
                return (
                  <TableRow
                    key={row._idx}
                    className={cn(
                      isSkipped && "opacity-40",
                      hasErrors && !isSkipped && "bg-destructive/5"
                    )}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {row._idx + 2}
                    </TableCell>
                    <TableCell>
                      {isSkipped ? (
                        <Badge variant="outline" className="text-xs">
                          Skipped
                        </Badge>
                      ) : hasErrors ? (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-green-600 hover:bg-green-700">
                          Valid
                        </Badge>
                      )}
                    </TableCell>

                    {/* Tenant */}
                    <TableCell>
                      {row.tenantId ? (
                        <span className="text-xs">
                          {tenants.find((t) => t.id === row.tenantId)?.name ||
                            row.tenantEmail}
                        </span>
                      ) : (
                        <Select
                          value=""
                          onValueChange={(val) => {
                            updateRow(row._idx, {
                              tenantId: parseInt(val),
                            });
                            reResolveRow(row._idx);
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-full border-destructive">
                            <SelectValue
                              placeholder={
                                row.tenantEmail || "Select tenant"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map((t) => (
                              <SelectItem
                                key={t.id}
                                value={String(t.id)}
                                className="text-xs"
                              >
                                {t.name} ({t.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    {/* Property */}
                    <TableCell>
                      {row.propertyId ? (
                        <span className="text-xs">
                          {properties.find((p) => p.id === row.propertyId)
                            ?.title || row.propertyName}
                        </span>
                      ) : (
                        <Select
                          value=""
                          onValueChange={(val) => {
                            const pid = parseInt(val);
                            updateRow(row._idx, {
                              propertyId: pid,
                              unitId: null,
                            });
                            setTimeout(() => reResolveRow(row._idx), 0);
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-full border-destructive">
                            <SelectValue
                              placeholder={
                                row.propertyName || "Select property"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {properties.map((p) => (
                              <SelectItem
                                key={p.id}
                                value={String(p.id)}
                                className="text-xs"
                              >
                                {p.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    {/* Unit */}
                    <TableCell>
                      {row.unitId ? (
                        <span className="text-xs">
                          {units.find((u) => u.id === row.unitId)
                            ?.unitNumber || row.unitNumber}
                        </span>
                      ) : (
                        <Select
                          value=""
                          onValueChange={(val) => {
                            updateRow(row._idx, {
                              unitId: parseInt(val),
                            });
                            reResolveRow(row._idx);
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-full border-destructive">
                            <SelectValue
                              placeholder={
                                row.unitNumber || "Select unit"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {propUnits(row.propertyId).map((u) => (
                              <SelectItem
                                key={u.id}
                                value={String(u.id)}
                                className="text-xs"
                              >
                                {u.unitNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    {/* Dates */}
                    <TableCell>
                      <Input
                        type="date"
                        className="h-7 text-xs w-[105px]"
                        value={row.startDate}
                        onChange={(e) => {
                          updateRow(row._idx, {
                            startDate: e.target.value,
                          });
                          reResolveRow(row._idx);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        className="h-7 text-xs w-[105px]"
                        value={row.endDate}
                        onChange={(e) => {
                          updateRow(row._idx, {
                            endDate: e.target.value,
                          });
                          reResolveRow(row._idx);
                        }}
                      />
                    </TableCell>

                    {/* Rent */}
                    <TableCell>
                      <Input
                        type="number"
                        className="h-7 text-xs w-[100px]"
                        value={row.rentAmount || ""}
                        onChange={(e) => {
                          updateRow(row._idx, {
                            rentAmount: parseFloat(e.target.value) || 0,
                          });
                          reResolveRow(row._idx);
                        }}
                      />
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Select
                        value={row.status}
                        onValueChange={(val) => {
                          updateRow(row._idx, { status: val });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-[85px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VALID_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleSkip(row._idx)}
                        title={isSkipped ? "Include row" : "Skip row"}
                      >
                        {isSkipped ? (
                          <ArrowLeft className="h-3.5 w-3.5" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Error details for visible rows */}
        {pagedRows.some((r) => r.errors.length > 0 && !r.skipped) && (
          <div className="text-xs space-y-1 p-2 bg-destructive/5 rounded-md max-h-24 overflow-auto">
            {pagedRows
              .filter((r) => r.errors.length > 0 && !r.skipped)
              .map((r) => (
                <div key={r._idx} className="text-destructive">
                  <strong>Row {r._idx + 2}:</strong> {r.errors.join("; ")}
                </div>
              ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---------- Step 3 ----------

  const renderReview = () => (
    <div className="flex flex-col gap-6 py-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
          <p className="text-2xl font-bold">{validRows.length}</p>
          <p className="text-sm text-muted-foreground">Ready to import</p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="text-2xl font-bold">{invalidRows.length}</p>
          <p className="text-sm text-muted-foreground">
            With errors (will be skipped)
          </p>
        </div>
        <div className="border rounded-lg p-4 text-center">
          <Trash2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-2xl font-bold">{skippedRows.length}</p>
          <p className="text-sm text-muted-foreground">Manually skipped</p>
        </div>
      </div>

      {validRows.length === 0 && (
        <div className="text-center py-6 text-destructive">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">No valid rows to import</p>
          <p className="text-sm text-muted-foreground mt-1">
            Go back to fix errors or check your data
          </p>
        </div>
      )}

      {importing && (
        <div className="space-y-2">
          <Progress value={importProgress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Importing {validRows.length} lease{validRows.length !== 1 ? "s" : ""}...
          </p>
        </div>
      )}
    </div>
  );

  // ---------- Step 4 ----------

  const renderResults = () => {
    if (!importResults) return null;
    return (
      <div className="flex flex-col gap-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold">{importResults.success}</p>
            <p className="text-sm text-muted-foreground">
              Successfully imported
            </p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <XCircle className="h-10 w-10 mx-auto mb-2 text-destructive" />
            <p className="text-3xl font-bold">{importResults.failed}</p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </div>
        </div>

        {importResults.errors.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Error details:</p>
            <ScrollArea className="h-40 border rounded-md p-3">
              {importResults.errors.map((e, i) => (
                <div
                  key={i}
                  className="text-xs text-destructive mb-1"
                >
                  {e.index >= 0 ? (
                    <span>
                      <strong>Row {e.index + 2}:</strong>{" "}
                      {e.messages.join("; ")}
                    </span>
                  ) : (
                    <span>{e.messages.join("; ")}</span>
                  )}
                </div>
              ))}
            </ScrollArea>
          </div>
        )}
      </div>
    );
  };

  // ------ Footer buttons ------

  const renderFooter = () => {
    switch (step) {
      case "upload":
        return (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={rows.length === 0}
              onClick={handleGoToValidate}
            >
              Next: Validate
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        );
      case "validate":
        return (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStep("upload")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              disabled={validRows.length === 0}
              onClick={() => setStep("review")}
            >
              Next: Review ({validRows.length} valid)
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        );
      case "review":
        return (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setStep("validate")}
              disabled={importing}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              disabled={validRows.length === 0 || importing}
              onClick={handleImport}
            >
              {importing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {validRows.length} lease
                  {validRows.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        );
      case "results":
        return (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={step === "results" ? onOpenChange : undefined}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Leases</DialogTitle>
          <DialogDescription>
            Upload an Excel file, validate and fix data, then import.
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="flex-1 overflow-auto min-h-0">
          {step === "upload" && renderUpload()}
          {step === "validate" && renderValidate()}
          {step === "review" && renderReview()}
          {step === "results" && renderResults()}
        </div>

        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
}
