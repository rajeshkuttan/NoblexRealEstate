import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { companyFinanceAPI } from "@/services/api";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  COMPANY_DOCUMENT_TYPES,
  NUMBER_SERIES_RESET_TYPES,
  labelForDocumentType,
  type NumberSeriesResetType,
} from "@/lib/companyDocumentTypes";
import { toast } from "sonner";

const defaultSeriesForm = () => ({
  documentType: "",
  prefix: "",
  suffix: "",
  padding: 4,
  currentNumber: 0,
  resetType: "yearly" as NumberSeriesResetType,
  isActive: true,
});

const defaultTemplateForm = () => ({
  documentType: "",
  showTrn: true,
  showBank: true,
  headerTemplate: "",
  footerTemplate: "",
  logo: "",
  signature: "",
  stamp: "",
});

export default function CompanyFinanceConfig() {
  const { activeCompanyId, isCompanyLoading } = useCompany();
  const [numberSeries, setNumberSeries] = useState<any[]>([]);
  const [financialYears, setFinancialYears] = useState<any[]>([]);
  const [financialPeriods, setFinancialPeriods] = useState<any[]>([]);
  const [vatPeriods, setVatPeriods] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [yearForm, setYearForm] = useState({
    yearName: "",
    startDate: "",
    endDate: "",
  });
  const [vatForm, setVatForm] = useState({
    periodName: "",
    startDate: "",
    endDate: "",
  });
  const [batchForm, setBatchForm] = useState({
    batchName: "",
    balanceDate: "",
  });

  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState<number | null>(null);
  const [seriesForm, setSeriesForm] = useState(defaultSeriesForm);
  const [seriesSaving, setSeriesSaving] = useState(false);
  const [seedingSeries, setSeedingSeries] = useState(false);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateIsEdit, setTemplateIsEdit] = useState(false);
  const [templateForm, setTemplateForm] = useState(defaultTemplateForm);
  const [templateSaving, setTemplateSaving] = useState(false);

  const configuredSeriesTypes = useMemo(
    () => new Set(numberSeries.map((r) => r.documentType as string)),
    [numberSeries],
  );
  const configuredTemplateTypes = useMemo(
    () => new Set(templates.map((t) => t.documentType as string)),
    [templates],
  );
  const availableSeriesTypes = useMemo(
    () => COMPANY_DOCUMENT_TYPES.filter((t) => !configuredSeriesTypes.has(t)),
    [configuredSeriesTypes],
  );
  const availableTemplateTypes = useMemo(
    () => COMPANY_DOCUMENT_TYPES.filter((t) => !configuredTemplateTypes.has(t)),
    [configuredTemplateTypes],
  );

  const loadAll = useCallback(async () => {
    if (isCompanyLoading) return;
    if (!activeCompanyId) {
      setNumberSeries([]);
      setFinancialYears([]);
      setFinancialPeriods([]);
      setVatPeriods([]);
      setTemplates([]);
      setBatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ns, fy, fp, vp, dt, ob] = await Promise.all([
        companyFinanceAPI.getNumberSeries(),
        companyFinanceAPI.getFinancialYears(),
        companyFinanceAPI.getFinancialPeriods(),
        companyFinanceAPI.getVatPeriods(),
        companyFinanceAPI.getDocumentTemplates(),
        companyFinanceAPI.getOpeningBalanceBatches(),
      ]);
      setNumberSeries(ns.data?.data ?? []);
      setFinancialYears(fy.data?.data ?? []);
      setFinancialPeriods(fp.data?.data ?? []);
      setVatPeriods(vp.data?.data ?? []);
      setTemplates(dt.data?.data ?? []);
      setBatches(ob.data?.data ?? []);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load company finance settings";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, isCompanyLoading]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const createYear = async () => {
    try {
      await companyFinanceAPI.createFinancialYear({ ...yearForm, isCurrent: true });
      toast.success("Financial year created");
      setYearForm({ yearName: "", startDate: "", endDate: "" });
      await loadAll();
      if (import.meta.env.DEV) {
        const res = await companyFinanceAPI.getFinancialYears();
        const rows = res.data?.data ?? [];
        if (!rows.length) {
          console.warn(
            "[CompanyFinanceConfig] Financial year created but list is still empty after reload",
          );
        }
      }
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to create year"
      );
    }
  };

  const createVatPeriod = async () => {
    try {
      await companyFinanceAPI.openVatPeriod(vatForm);
      toast.success("VAT period opened");
      setVatForm({ periodName: "", startDate: "", endDate: "" });
      loadAll();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to open VAT period"
      );
    }
  };

  const openAddSeries = () => {
    setEditingSeriesId(null);
    const firstType = availableSeriesTypes[0] || "";
    setSeriesForm({
      ...defaultSeriesForm(),
      documentType: firstType,
      prefix: firstType ? (firstType === "invoice" ? "INV" : firstType.slice(0, 3).toUpperCase()) : "",
    });
    setSeriesDialogOpen(true);
  };

  const openEditSeries = (row: {
    id: number;
    documentType: string;
    prefix?: string;
    suffix?: string;
    padding?: number;
    currentNumber?: number;
    resetType?: string;
    isActive?: boolean;
  }) => {
    setEditingSeriesId(row.id);
    setSeriesForm({
      documentType: row.documentType,
      prefix: row.prefix ?? "",
      suffix: row.suffix ?? "",
      padding: row.padding ?? 4,
      currentNumber: row.currentNumber ?? 0,
      resetType: (row.resetType as NumberSeriesResetType) || "yearly",
      isActive: row.isActive !== false,
    });
    setSeriesDialogOpen(true);
  };

  const saveSeries = async () => {
    if (!seriesForm.documentType) {
      toast.error("Document type is required");
      return;
    }
    setSeriesSaving(true);
    try {
      const payload = {
        documentType: seriesForm.documentType,
        prefix: seriesForm.prefix || null,
        suffix: seriesForm.suffix || null,
        padding: Number(seriesForm.padding) || 4,
        currentNumber: Number(seriesForm.currentNumber) || 0,
        resetType: seriesForm.resetType,
        isActive: seriesForm.isActive,
      };
      if (editingSeriesId) {
        await companyFinanceAPI.updateNumberSeries(editingSeriesId, payload);
        toast.success("Number series updated");
      } else {
        await companyFinanceAPI.createNumberSeries(payload);
        toast.success("Number series created");
      }
      setSeriesDialogOpen(false);
      await loadAll();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to save number series",
      );
    } finally {
      setSeriesSaving(false);
    }
  };

  const seedSeriesDefaults = async () => {
    setSeedingSeries(true);
    try {
      const res = await companyFinanceAPI.seedNumberSeriesDefaults();
      const created = res.data?.data?.created ?? 0;
      toast.success(
        created > 0 ? `Added ${created} default number series` : "All default series already exist",
      );
      await loadAll();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to seed number series",
      );
    } finally {
      setSeedingSeries(false);
    }
  };

  const previewSeries = async (documentType: string) => {
    try {
      const res = await companyFinanceAPI.previewNumber(documentType);
      const preview = res.data?.data?.preview;
      if (preview) {
        toast.info(`Next number: ${preview}`, { duration: 6000 });
      } else {
        toast.warning("No preview available for this series");
      }
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Preview failed",
      );
    }
  };

  const openAddTemplate = () => {
    const firstType = availableTemplateTypes[0] || "";
    setTemplateIsEdit(false);
    setTemplateForm({ ...defaultTemplateForm(), documentType: firstType });
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (row: {
    documentType: string;
    showTrn?: boolean;
    showBank?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    logo?: string;
    signature?: string;
    stamp?: string;
  }) => {
    setTemplateIsEdit(true);
    setTemplateForm({
      documentType: row.documentType,
      showTrn: row.showTrn !== false,
      showBank: row.showBank !== false,
      headerTemplate: row.headerTemplate ?? "",
      footerTemplate: row.footerTemplate ?? "",
      logo: row.logo ?? "",
      signature: row.signature ?? "",
      stamp: row.stamp ?? "",
    });
    setTemplateDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.documentType) {
      toast.error("Document type is required");
      return;
    }
    setTemplateSaving(true);
    try {
      await companyFinanceAPI.upsertDocumentTemplate({
        documentType: templateForm.documentType,
        showTrn: templateForm.showTrn,
        showBank: templateForm.showBank,
        headerTemplate: templateForm.headerTemplate || null,
        footerTemplate: templateForm.footerTemplate || null,
        logo: templateForm.logo || null,
        signature: templateForm.signature || null,
        stamp: templateForm.stamp || null,
      });
      toast.success("Document template saved");
      setTemplateDialogOpen(false);
      await loadAll();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to save template",
      );
    } finally {
      setTemplateSaving(false);
    }
  };

  const createBatch = async () => {
    try {
      await companyFinanceAPI.createOpeningBalanceBatch(batchForm);
      toast.success("Opening balance batch created");
      setBatchForm({ batchName: "", balanceDate: "" });
      loadAll();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to create batch"
      );
    }
  };

  if (loading) {
    return <div className="p-6">Loading company finance configuration…</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company Finance Configuration</h1>
          <p className="text-muted-foreground">
            Numbering, periods, VAT locks, templates, and opening balance batches for the active company.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/settings/company-settings">Company settings</Link>
        </Button>
      </div>

      <Tabs defaultValue="numbering">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="numbering">Number series</TabsTrigger>
          <TabsTrigger value="years">Financial years</TabsTrigger>
          <TabsTrigger value="periods">Financial periods</TabsTrigger>
          <TabsTrigger value="vat">VAT periods</TabsTrigger>
          <TabsTrigger value="templates">Document templates</TabsTrigger>
          <TabsTrigger value="opening">Opening balances</TabsTrigger>
        </TabsList>

        <TabsContent value="numbering">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Document number series</CardTitle>
                <CardDescription>
                  Per-company prefixes and sequences used when creating invoices, JVs, POs, and other
                  documents.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={seedingSeries}
                  onClick={seedSeriesDefaults}
                >
                  {seedingSeries ? "Seeding…" : "Seed defaults"}
                </Button>
                <Button
                  size="sm"
                  disabled={availableSeriesTypes.length === 0}
                  onClick={openAddSeries}
                >
                  Add series
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Reset</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {numberSeries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground text-center">
                        No number series for this company. Use Seed defaults or Add series.
                      </TableCell>
                    </TableRow>
                  ) : (
                    numberSeries.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{labelForDocumentType(row.documentType)}</TableCell>
                        <TableCell>{row.prefix ?? "—"}</TableCell>
                        <TableCell>{row.currentNumber}</TableCell>
                        <TableCell>{row.resetType}</TableCell>
                        <TableCell>{row.isActive !== false ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => previewSeries(row.documentType)}
                          >
                            Preview
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditSeries(row)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="years">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Open financial year</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>Year name</Label>
                <Input
                  value={yearForm.yearName}
                  onChange={(e) => setYearForm({ ...yearForm, yearName: e.target.value })}
                />
              </div>
              <div>
                <Label>Start</Label>
                <Input
                  type="date"
                  value={yearForm.startDate}
                  onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="date"
                  value={yearForm.endDate}
                  onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={createYear}>Create year</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialYears.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground text-center">
                        No financial years yet. Create one above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    financialYears.map((y) => (
                      <TableRow key={y.id}>
                        <TableCell>{y.yearName}</TableCell>
                        <TableCell>
                          {y.startDate} – {y.endDate}
                        </TableCell>
                        <TableCell>
                          {y.isClosed ? "Closed" : y.isCurrent ? "Current" : "Open"}
                        </TableCell>
                        <TableCell>
                          {!y.isClosed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                await companyFinanceAPI.closeFinancialYear(y.id);
                                loadAll();
                              }}
                            >
                              Close
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periods">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialPeriods.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.periodNo}</TableCell>
                      <TableCell>
                        {p.startDate} – {p.endDate}
                      </TableCell>
                      <TableCell>{p.status}</TableCell>
                      <TableCell className="space-x-2">
                        {p.status === "OPEN" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                await companyFinanceAPI.closeFinancialPeriod(p.id, "soft");
                                loadAll();
                              }}
                            >
                              Soft close
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                await companyFinanceAPI.closeFinancialPeriod(p.id, "hard");
                                loadAll();
                              }}
                            >
                              Hard close
                            </Button>
                          </>
                        )}
                        {p.status !== "OPEN" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await companyFinanceAPI.openFinancialPeriod(p.id);
                              loadAll();
                            }}
                          >
                            Reopen
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vat">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Open VAT period</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={vatForm.periodName}
                  onChange={(e) => setVatForm({ ...vatForm, periodName: e.target.value })}
                />
              </div>
              <div>
                <Label>Start</Label>
                <Input
                  type="date"
                  value={vatForm.startDate}
                  onChange={(e) => setVatForm({ ...vatForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="date"
                  value={vatForm.endDate}
                  onChange={(e) => setVatForm({ ...vatForm, endDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={createVatPeriod}>Open period</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vatPeriods.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{v.periodName}</TableCell>
                      <TableCell>
                        {v.startDate} – {v.endDate}
                      </TableCell>
                      <TableCell>{v.status}</TableCell>
                      <TableCell className="space-x-2">
                        {v.status === "OPEN" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await companyFinanceAPI.lockVatPeriod(v.id);
                              loadAll();
                            }}
                          >
                            Lock
                          </Button>
                        )}
                        {v.status !== "SUBMITTED" && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              await companyFinanceAPI.submitVatPeriod(v.id);
                              loadAll();
                            }}
                          >
                            Submit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Document templates</CardTitle>
                <CardDescription>
                  {templates.length} template(s) configured. Documents without a template use company
                  profile defaults (TRN and bank shown).
                </CardDescription>
              </div>
              <Button
                size="sm"
                disabled={availableTemplateTypes.length === 0}
                onClick={openAddTemplate}
              >
                Configure template
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Show TRN</TableHead>
                    <TableHead>Show bank</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground text-center">
                        No templates configured — documents use company defaults. Add a template to
                        customize TRN/bank visibility per document type.
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{labelForDocumentType(t.documentType)}</TableCell>
                        <TableCell>{t.showTrn ? "Yes" : "No"}</TableCell>
                        <TableCell>{t.showBank ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openEditTemplate(t)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opening">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>New opening balance batch</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Batch name</Label>
                <Input
                  value={batchForm.batchName}
                  onChange={(e) => setBatchForm({ ...batchForm, batchName: e.target.value })}
                />
              </div>
              <div>
                <Label>Balance date</Label>
                <Input
                  type="date"
                  value={batchForm.balanceDate}
                  onChange={(e) => setBatchForm({ ...batchForm, balanceDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={createBatch}>Create batch</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.batchName}</TableCell>
                      <TableCell>{b.balanceDate}</TableCell>
                      <TableCell>{b.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={seriesDialogOpen} onOpenChange={setSeriesDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSeriesId ? "Edit number series" : "Add number series"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Document type</Label>
              <Select
                value={seriesForm.documentType}
                disabled={!!editingSeriesId}
                onValueChange={(v) => setSeriesForm({ ...seriesForm, documentType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(editingSeriesId
                    ? COMPANY_DOCUMENT_TYPES
                    : availableSeriesTypes.length
                      ? availableSeriesTypes
                      : COMPANY_DOCUMENT_TYPES
                  ).map((t) => (
                    <SelectItem key={t} value={t}>
                      {labelForDocumentType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prefix</Label>
                <Input
                  value={seriesForm.prefix}
                  onChange={(e) => setSeriesForm({ ...seriesForm, prefix: e.target.value })}
                  placeholder="INV"
                />
              </div>
              <div>
                <Label>Suffix</Label>
                <Input
                  value={seriesForm.suffix}
                  onChange={(e) => setSeriesForm({ ...seriesForm, suffix: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Padding</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={seriesForm.padding}
                  onChange={(e) =>
                    setSeriesForm({ ...seriesForm, padding: parseInt(e.target.value, 10) || 4 })
                  }
                />
              </div>
              <div>
                <Label>Current number</Label>
                <Input
                  type="number"
                  min={0}
                  value={seriesForm.currentNumber}
                  onChange={(e) =>
                    setSeriesForm({
                      ...seriesForm,
                      currentNumber: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Reset type</Label>
              <Select
                value={seriesForm.resetType}
                onValueChange={(v) =>
                  setSeriesForm({ ...seriesForm, resetType: v as NumberSeriesResetType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NUMBER_SERIES_RESET_TYPES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={seriesForm.isActive}
                onCheckedChange={(checked) => setSeriesForm({ ...seriesForm, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeriesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSeries} disabled={seriesSaving}>
              {seriesSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Document type</Label>
              <Select
                value={templateForm.documentType}
                onValueChange={(v) => setTemplateForm({ ...templateForm, documentType: v })}
                disabled={templateIsEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(templateIsEdit
                    ? COMPANY_DOCUMENT_TYPES
                    : availableTemplateTypes.length
                      ? availableTemplateTypes
                      : COMPANY_DOCUMENT_TYPES
                  ).map((t) => (
                    <SelectItem key={t} value={t}>
                      {labelForDocumentType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={templateForm.showTrn}
                  onCheckedChange={(checked) =>
                    setTemplateForm({ ...templateForm, showTrn: checked })
                  }
                />
                <Label>Show TRN</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={templateForm.showBank}
                  onCheckedChange={(checked) =>
                    setTemplateForm({ ...templateForm, showBank: checked })
                  }
                />
                <Label>Show bank details</Label>
              </div>
            </div>
            <div>
              <Label>Header template (optional HTML)</Label>
              <Textarea
                rows={3}
                value={templateForm.headerTemplate}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, headerTemplate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Footer template (optional HTML)</Label>
              <Textarea
                rows={3}
                value={templateForm.footerTemplate}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, footerTemplate: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Logo path</Label>
                <Input
                  value={templateForm.logo}
                  onChange={(e) => setTemplateForm({ ...templateForm, logo: e.target.value })}
                  placeholder="/uploads/..."
                />
              </div>
              <div>
                <Label>Signature path</Label>
                <Input
                  value={templateForm.signature}
                  onChange={(e) => setTemplateForm({ ...templateForm, signature: e.target.value })}
                />
              </div>
              <div>
                <Label>Stamp path</Label>
                <Input
                  value={templateForm.stamp}
                  onChange={(e) => setTemplateForm({ ...templateForm, stamp: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={templateSaving}>
              {templateSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
