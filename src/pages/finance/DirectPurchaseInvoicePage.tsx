import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  directPurchaseInvoicesAPI,
  vendorsAPI,
  chartOfAccountsAPI,
  ledgerSetupsAPI,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import {
  generateDirectPurchaseInvoiceHtml,
  printDocument,
  defaultCompanyBranding,
} from "@/utils/printUtils";

type LineRow = {
  expenseAccountId: string;
  inputTaxAccountId: string;
  description: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
};

const accountOption = (a: { id: number; accountCode: string; accountName: string }) => ({
  value: String(a.id),
  label: `${a.accountCode} - ${a.accountName}`,
});

function ledgerPostingId(
  setups: any[],
  documentType: string,
  opts: { amountType?: string; calculationOn?: string }
): string {
  const match = setups.find(
    (l) =>
      l.documentType === documentType &&
      (!opts.amountType || l.amountType === opts.amountType) &&
      (!opts.calculationOn || l.calculationOn === opts.calculationOn)
  );
  return match?.postingType != null ? String(match.postingType) : "";
}

function resolveDefaultVatAccountId(setups: any[]): string {
  return (
    ledgerPostingId(setups, "Purchase Invoice", { calculationOn: "Tax" }) ||
    ledgerPostingId(setups, "Purchase Invoice", { calculationOn: "Others" }) ||
    ""
  );
}

export default function DirectPurchaseInvoicePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const isNew = !id;
  const mode = searchParams.get("mode");
  const { activeCompany } = useCompany();

  const [fetching, setFetching] = useState(!!id);
  const [vendors, setVendors] = useState<any[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [liabilityAccounts, setLiabilityAccounts] = useState<any[]>([]);
  const [vatAccounts, setVatAccounts] = useState<any[]>([]);
  const [ledgerSetups, setLedgerSetups] = useState<any[]>([]);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [vendorId, setVendorId] = useState("");
  const [payableAccountId, setPayableAccountId] = useState("");
  const [defaultVatAccountId, setDefaultVatAccountId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [description, setDescription] = useState("");

  const makeEmptyLine = useCallback(
    (vatId?: string): LineRow => ({
      expenseAccountId: "",
      inputTaxAccountId: vatId || defaultVatAccountId || "",
      description: "",
      amount: 0,
      taxRate: 5,
      taxAmount: 0,
    }),
    [defaultVatAccountId]
  );

  const [lines, setLines] = useState<LineRow[]>([
    {
      expenseAccountId: "",
      inputTaxAccountId: "",
      description: "",
      amount: 0,
      taxRate: 5,
      taxAmount: 0,
    },
  ]);

  const isView = mode === "view" || (invoice && invoice.status !== "DRAFT");
  const readOnly = isView;

  const loadMasterData = useCallback(async () => {
    const [vRes, aRes, lsRes] = await Promise.all([
      vendorsAPI.getAll({ limit: 200, status: "active" }),
      chartOfAccountsAPI.getAll({ limit: 500 }),
      ledgerSetupsAPI.getAll({ limit: 200 }),
    ]);
    setVendors(vRes.data?.data?.vendors ?? vRes.data?.data ?? []);
    const list = aRes.data?.data?.accounts ?? aRes.data?.data ?? [];
    setExpenseAccounts(list.filter((a: any) => a.accountType === "expense"));
    setLiabilityAccounts(list.filter((a: any) => a.accountType === "liability"));
    setVatAccounts(
      list.filter((a: any) => a.accountType === "asset" || a.accountType === "liability")
    );
    const setups = lsRes.data?.data ?? lsRes.data ?? [];
    setLedgerSetups(Array.isArray(setups) ? setups : []);
  }, []);

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    setFetching(true);
    try {
      const res = await directPurchaseInvoicesAPI.getById(parseInt(id, 10));
      const inv = res.data?.data;
      setInvoice(inv);
      setVendorId(String(inv.vendorId));
      setPayableAccountId(inv.payableAccountId ? String(inv.payableAccountId) : "");
      setInvoiceDate(String(inv.invoiceDate).slice(0, 10));
      setDueDate(String(inv.dueDate || inv.invoiceDate).slice(0, 10));
      setSupplierInvoiceNo(inv.supplierInvoiceNo || "");
      setDescription(inv.description || "");
      const mapped =
        (inv.lines || []).length > 0
          ? (inv.lines || []).map((l: any) => ({
              expenseAccountId: String(l.expenseAccountId),
              inputTaxAccountId: l.inputTaxAccountId ? String(l.inputTaxAccountId) : "",
              description: l.description || "",
              amount: Number(l.amount),
              taxRate: Number(l.taxRate),
              taxAmount: Number(l.taxAmount),
            }))
          : [
              {
                expenseAccountId: "",
                inputTaxAccountId: "",
                description: "",
                amount: 0,
                taxRate: 5,
                taxAmount: 0,
              },
            ];
      setLines(mapped);
      const firstVat = mapped.find((l) => l.inputTaxAccountId)?.inputTaxAccountId;
      if (firstVat) setDefaultVatAccountId(firstVat);
    } catch {
      toast.error("Failed to load invoice");
      navigate("/finance/direct-purchase-invoices");
    } finally {
      setFetching(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    if (id) loadInvoice();
  }, [id, loadInvoice]);

  useEffect(() => {
    if (!isNew || defaultsLoaded || !ledgerSetups.length) return;
    const payable = ledgerPostingId(ledgerSetups, "Purchase Invoice", { amountType: "Cr" });
    const vat = resolveDefaultVatAccountId(ledgerSetups);
    if (payable) setPayableAccountId(payable);
    if (vat) {
      setDefaultVatAccountId(vat);
      setLines((prev) =>
        prev.map((l) => ({
          ...l,
          inputTaxAccountId: l.inputTaxAccountId || vat,
        }))
      );
    }
    setDefaultsLoaded(true);
  }, [isNew, defaultsLoaded, ledgerSetups]);

  const recalcLine = (line: LineRow): LineRow => {
    const amount = Number(line.amount) || 0;
    const taxRate = Number(line.taxRate) || 0;
    const taxAmount = Math.round((amount * taxRate) / 100 * 100) / 100;
    return { ...line, taxAmount };
  };

  const summary = lines.reduce(
    (acc, l) => {
      const amount = Number(l.amount) || 0;
      const tax = Number(l.taxAmount) || 0;
      acc.subtotal += amount;
      acc.tax += tax;
      return acc;
    },
    { subtotal: 0, tax: 0 }
  );
  summary.subtotal = Math.round(summary.subtotal * 100) / 100;
  summary.tax = Math.round(summary.tax * 100) / 100;
  const total = Math.round((summary.subtotal + summary.tax) * 100) / 100;

  const findAccount = (accountId: string, pools: any[][]) => {
    if (!accountId) return null;
    for (const pool of pools) {
      const a = pool.find((x) => String(x.id) === accountId);
      if (a) return a;
    }
    return null;
  };

  const accountLabelById = (accountId: string) => {
    const a = findAccount(accountId, [expenseAccounts, liabilityAccounts, vatAccounts]);
    return a ? `${a.accountCode} - ${a.accountName}` : "—";
  };

  const postingPreview = useMemo(() => {
    const entries: { side: string; account: string; amount: number }[] = [];
    for (const line of lines) {
      const amt = Number(line.amount) || 0;
      const tax = Number(line.taxAmount) || 0;
      if (amt > 0) {
        entries.push({
          side: "Dr",
          account: accountLabelById(line.expenseAccountId),
          amount: amt,
        });
      }
      if (tax > 0) {
        entries.push({
          side: "Dr",
          account: accountLabelById(line.inputTaxAccountId) || "(Input VAT — not selected)",
          amount: tax,
        });
      }
    }
    if (total > 0) {
      entries.push({
        side: "Cr",
        account: accountLabelById(payableAccountId) || "(Vendor payable — not selected)",
        amount: total,
      });
    }
    return entries;
  }, [lines, payableAccountId, expenseAccounts, liabilityAccounts, vatAccounts, total]);

  const companyInfo = {
    name: activeCompany?.company_name || defaultCompanyBranding.name,
    address: defaultCompanyBranding.address,
    phone: defaultCompanyBranding.phone,
    email: defaultCompanyBranding.email,
    vatNumber: activeCompany?.vat_number || defaultCompanyBranding.vatNumber,
  };

  const handlePrint = async () => {
    try {
      let data = invoice;
      if (!data && id) {
        const res = await directPurchaseInvoicesAPI.getById(parseInt(id, 10));
        data = res.data?.data;
      }
      if (!data) {
        const vendor = vendors.find((v) => String(v.id) === vendorId);
        const payableAcc = findAccount(payableAccountId, [liabilityAccounts]);
        data = {
          dpiNumber: "DRAFT",
          status: "DRAFT",
          invoiceDate,
          dueDate,
          supplierInvoiceNo,
          description,
          currency: "AED",
          subtotalAmount: summary.subtotal,
          taxAmount: summary.tax,
          totalAmount: total,
          paidAmount: 0,
          outstandingAmount: total,
          vendor,
          payableAccount: payableAcc
            ? { accountCode: payableAcc.accountCode, accountName: payableAcc.accountName }
            : null,
          lines: lines.map((l) => {
            const exp = findAccount(l.expenseAccountId, [expenseAccounts]);
            const vat = findAccount(l.inputTaxAccountId, [vatAccounts]);
            return {
              description: l.description,
              amount: l.amount,
              taxRate: l.taxRate,
              taxAmount: l.taxAmount,
              totalAmount: round2((l.amount || 0) + (l.taxAmount || 0)),
              expenseAccount: exp
                ? { accountCode: exp.accountCode, accountName: exp.accountName }
                : null,
              inputTaxAccount: vat
                ? { accountCode: vat.accountCode, accountName: vat.accountName }
                : null,
            };
          }),
        };
      }
      const html = generateDirectPurchaseInvoiceHtml({ ...data, companyInfo });
      printDocument(`DPI - ${data.dpiNumber || "Draft"}`, html);
    } catch {
      toast.error("Failed to generate print view");
    }
  };

  function round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  const save = async () => {
    if (!vendorId) {
      toast.error("Select a vendor");
      return;
    }
    for (const line of lines) {
      if ((Number(line.taxRate) > 0 || Number(line.taxAmount) > 0) && !line.inputTaxAccountId) {
        toast.error("Select an Input VAT ledger for each taxable line");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        vendorId: parseInt(vendorId, 10),
        invoiceDate,
        dueDate,
        supplierInvoiceNo: supplierInvoiceNo || null,
        description,
        payableAccountId: payableAccountId ? parseInt(payableAccountId, 10) : null,
        lines: lines.map((l) => ({
          expenseAccountId: parseInt(l.expenseAccountId, 10),
          inputTaxAccountId: l.inputTaxAccountId ? parseInt(l.inputTaxAccountId, 10) : null,
          description: l.description,
          amount: Number(l.amount),
          taxRate: Number(l.taxRate),
          taxAmount: Number(l.taxAmount),
        })),
      };
      if (id) {
        await directPurchaseInvoicesAPI.update(parseInt(id, 10), payload);
        toast.success("Updated");
        await loadInvoice();
      } else {
        const res = await directPurchaseInvoicesAPI.create(payload);
        const created = res.data?.data;
        toast.success("Created");
        navigate(`/finance/direct-purchase-invoices/${created.id}`);
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const postInvoice = async () => {
    if (!id) return;
    try {
      await directPurchaseInvoicesAPI.post(parseInt(id, 10));
      toast.success("Posted to ledger");
      await loadInvoice();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Post failed"
      );
    }
  };

  const addLine = () => {
    setLines([...lines, makeEmptyLine(defaultVatAccountId)]);
  };

  const lineHasVat = (line: LineRow) =>
    Number(line.taxRate) > 0 || Number(line.taxAmount) > 0;

  if (fetching) {
    return (
      <div className="container mx-auto p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/finance/direct-purchase-invoices")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? "New Direct Purchase Invoice" : invoice?.dpiNumber || "Direct Purchase Invoice"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Book expenses and input VAT directly to vendor payable (no PO/GRN).
            </p>
            {invoice?.status && (
              <Badge className="mt-2" variant={invoice.status === "DRAFT" ? "secondary" : "default"}>
                {invoice.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {invoice?.status === "DRAFT" && id && (
            <Button onClick={postInvoice}>Post to ledger</Button>
          )}
          {!readOnly && (
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save draft"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Vendor</Label>
              <SearchableSelect
                value={vendorId}
                onValueChange={setVendorId}
                disabled={readOnly}
                options={vendors.map((v) => ({
                  value: String(v.id),
                  label: v.vendorName,
                }))}
                placeholder="Select vendor"
              />
            </div>
            <div>
              <Label>Supplier invoice no.</Label>
              <Input
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label>Invoice date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <Label>Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounting — credit (vendor payable)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Label>Vendor payable account</Label>
            <SearchableSelect
              value={payableAccountId}
              onValueChange={setPayableAccountId}
              disabled={readOnly}
              options={liabilityAccounts.map(accountOption)}
              placeholder="Select accounts payable / vendor payable"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Credited on post for the invoice total. Defaults from Ledger Setup (Purchase Invoice, Cr).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expense lines (debit)</CardTitle>
          {!readOnly && (
            <Button type="button" size="sm" variant="outline" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />
              Add line
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, idx) => (
            <div key={idx} className="grid gap-2 border p-3 rounded-md">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Expense account (Dr)</Label>
                  <SearchableSelect
                    value={line.expenseAccountId}
                    onValueChange={(v) => {
                      const next = [...lines];
                      next[idx] = { ...line, expenseAccountId: v };
                      setLines(next);
                    }}
                    disabled={readOnly}
                    options={expenseAccounts.map(accountOption)}
                    placeholder="Expense account"
                  />
                </div>
                <div>
                  <Label className="text-xs">Line description</Label>
                  <Input
                    value={line.description}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...line, description: e.target.value };
                      setLines(next);
                    }}
                    disabled={readOnly}
                  />
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <div>
                  <Label className="text-xs">Amount (excl. VAT)</Label>
                  <Input
                    type="number"
                    value={line.amount}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = recalcLine({ ...line, amount: parseFloat(e.target.value) || 0 });
                      setLines(next);
                    }}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label className="text-xs">VAT %</Label>
                  <Input
                    type="number"
                    value={line.taxRate}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = recalcLine({
                        ...line,
                        taxRate: parseFloat(e.target.value) || 0,
                      });
                      setLines(next);
                    }}
                    disabled={readOnly}
                  />
                </div>
                {lineHasVat(line) && (
                  <div className="md:col-span-2">
                    <Label className="text-xs">Input VAT account (Dr)</Label>
                    <SearchableSelect
                      value={line.inputTaxAccountId}
                      onValueChange={(v) => {
                        const next = [...lines];
                        next[idx] = { ...line, inputTaxAccountId: v };
                        setLines(next);
                        if (v) setDefaultVatAccountId(v);
                      }}
                      disabled={readOnly}
                      options={vatAccounts.map(accountOption)}
                      placeholder="Input VAT / recoverable VAT"
                    />
                  </div>
                )}
                {!readOnly && (
                  <div className="flex items-end justify-end md:col-span-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground text-right">
                VAT: {Number(line.taxAmount).toFixed(2)} · Line total:{" "}
                {round2((line.amount || 0) + (line.taxAmount || 0)).toFixed(2)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {!readOnly && postingPreview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posting preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 font-medium">Dr/Cr</th>
                    <th className="text-left p-2 font-medium">Account</th>
                    <th className="text-right p-2 font-medium">Amount (AED)</th>
                  </tr>
                </thead>
                <tbody>
                  {postingPreview.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono">{row.side}</td>
                      <td className="p-2">{row.account}</td>
                      <td className="p-2 text-right">{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="text-sm space-y-1 w-64">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{summary.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT</span>
                <span>{summary.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Total</span>
                <span>
                  {(invoice?.totalAmount != null && readOnly
                    ? Number(invoice.totalAmount)
                    : total
                  ).toFixed(2)}{" "}
                  AED
                </span>
              </div>
              {invoice && invoice.status !== "DRAFT" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid</span>
                    <span>{Number(invoice.paidAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span>{Number(invoice.outstandingAmount).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
