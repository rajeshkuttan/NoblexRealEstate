import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { chartOfAccountsAPI, leaseRevenueAPI, leasesAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateMonthlySchedulePreview,
  previewScheduleSummary,
} from "./leaseRevenueSchedulePreview";
import { apiMessage } from "./LeaseRevenueRegisterPage";

const accountOption = (a: { id: number; accountCode: string; accountName: string }) => ({
  value: String(a.id),
  label: `${a.accountCode} - ${a.accountName}`,
});

export default function LeaseRevenueFormPage() {
  const { t } = useTranslation("leaseRevenue");
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const { can } = useAuth();

  const [fetching, setFetching] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [revenueAccounts, setRevenueAccounts] = useState<any[]>([]);
  const [liabilityAccounts, setLiabilityAccounts] = useState<any[]>([]);

  const [leaseId, setLeaseId] = useState(searchParams.get("leaseId") ?? "");
  const [totalContractAmount, setTotalContractAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState("AED");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [serviceStartDate, setServiceStartDate] = useState("");
  const [serviceEndDate, setServiceEndDate] = useState("");
  const [recognitionMethod, setRecognitionMethod] = useState("DAILY_CALENDAR_MONTH");
  const [revenueModel, setRevenueModel] = useState("DEFERRED");
  const [postingMode, setPostingMode] = useState("AUTO_CREATE_DRAFT_JV");
  const [revenueAccountId, setRevenueAccountId] = useState("");
  const [deferredRevenueAccountId, setDeferredRevenueAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [recordStatus, setRecordStatus] = useState("DRAFT");

  const readOnly = isEdit && !["DRAFT", "SCHEDULE_GENERATED"].includes(recordStatus);

  const selectedLease = useMemo(
    () => leases.find((l) => String(l.id) === String(leaseId)) ?? null,
    [leases, leaseId]
  );

  const leaseOptions = useMemo(
    () =>
      leases.map((l) => {
        const tenant = l.tenant?.name ?? "—";
        const property = l.unit?.property?.title ?? "—";
        const unit = l.unit?.unitNumber ?? l.unit?.unit_number ?? "—";
        const status = l.status ? ` [${l.status}]` : "";
        return {
          value: String(l.id),
          label: `${l.leaseNumber ?? l.id} — ${tenant} · ${property} / ${unit}${status}`,
        };
      }),
    [leases]
  );

  const schedulePreview = useMemo(
    () =>
      calculateMonthlySchedulePreview(totalContractAmount, serviceStartDate, serviceEndDate),
    [totalContractAmount, serviceStartDate, serviceEndDate]
  );
  const previewSummary = useMemo(() => previewScheduleSummary(schedulePreview), [schedulePreview]);

  const applyLeaseDefaults = useCallback(
    (lease: any) => {
      if (!lease || isEdit) return;
      if (lease.startDate) setServiceStartDate(String(lease.startDate).slice(0, 10));
      if (lease.endDate) setServiceEndDate(String(lease.endDate).slice(0, 10));
      if (lease.rentAmount != null && lease.rentAmount !== "") {
        setTotalContractAmount(String(lease.rentAmount));
      }
    },
    [isEdit]
  );

  const loadMaster = useCallback(async () => {
    try {
      // Leases API returns { data: { leases, pagination } }; max page size is 100.
      const [leasesRes, coaRes] = await Promise.all([
        leasesAPI.getAll({ limit: 100, page: 1 }, true),
        chartOfAccountsAPI.getAll({ limit: 500 }),
      ]);
      const payload = leasesRes.data?.data ?? {};
      const leaseList = Array.isArray(payload.leases)
        ? payload.leases
        : Array.isArray(payload)
          ? payload
          : [];
      setLeases(leaseList);

      const list = coaRes.data?.data?.accounts ?? coaRes.data?.data ?? [];
      const accounts = Array.isArray(list) ? list : [];
      const isLeaf = (a: any) =>
        !(Array.isArray(a.subAccounts) && a.subAccounts.length > 0);
      setRevenueAccounts(
        accounts.filter((a: any) => a.accountType === "income" && a.isActive !== false && isLeaf(a))
      );
      setLiabilityAccounts(
        accounts.filter((a: any) => a.accountType === "liability" && a.isActive !== false && isLeaf(a))
      );
    } catch {
      toast.error(t("toast.loadFailed"));
      setLeases([]);
    }
  }, [t]);

  const loadRecord = useCallback(async () => {
    if (!id) return;
    setFetching(true);
    try {
      const res = await leaseRevenueAPI.getById(parseInt(id, 10));
      const r = res.data?.data;
      if (!r) throw new Error("Not found");
      setLeaseId(String(r.leaseId ?? ""));
      setTotalContractAmount(String(r.totalContractAmount ?? ""));
      setCurrencyCode(r.currencyCode ?? "AED");
      setExchangeRate(String(r.exchangeRate ?? 1));
      setServiceStartDate(String(r.serviceStartDate).slice(0, 10));
      setServiceEndDate(String(r.serviceEndDate).slice(0, 10));
      setRecognitionMethod(r.recognitionMethod ?? "DAILY_CALENDAR_MONTH");
      setRevenueModel(r.revenueModel ?? "DEFERRED");
      setPostingMode(r.postingMode ?? "AUTO_CREATE_DRAFT_JV");
      setRevenueAccountId(String(r.revenueAccountId ?? ""));
      setDeferredRevenueAccountId(String(r.deferredRevenueAccountId ?? ""));
      setNotes(r.notes ?? "");
      setRecordStatus(r.status ?? "DRAFT");
    } catch {
      toast.error(t("toast.loadFailed"));
      navigate("/finance/lease-revenue");
    } finally {
      setFetching(false);
    }
  }, [id, navigate, t]);

  useEffect(() => {
    void loadMaster();
  }, [loadMaster]);

  useEffect(() => {
    if (isEdit) void loadRecord();
  }, [isEdit, loadRecord]);

  // Prefill amounts/dates when arriving with ?leaseId= once leases are loaded.
  useEffect(() => {
    if (!leaseId || isEdit || !selectedLease) return;
    if (!totalContractAmount && !serviceStartDate && !serviceEndDate) {
      applyLeaseDefaults(selectedLease);
    }
  }, [
    leaseId,
    isEdit,
    selectedLease,
    totalContractAmount,
    serviceStartDate,
    serviceEndDate,
    applyLeaseDefaults,
  ]);

  const onLeaseChange = (value: string) => {
    setLeaseId(value);
    const lease = leases.find((l) => String(l.id) === value);
    applyLeaseDefaults(lease);
  };

  const generateFromLease = async () => {
    if (!leaseId || !can("module:lease_revenue:create")) return;
    setGenerating(true);
    try {
      const res = await leaseRevenueAPI.generateFromLease({
        leaseId: parseInt(leaseId, 10),
        revenueModel,
      });
      const created = res.data?.data;
      toast.success(t("toast.generateFromLeaseSuccess"));
      navigate(`/finance/lease-revenue/${created?.id ?? ""}`);
    } catch (e) {
      toast.error(apiMessage(e) || t("toast.generateFromLeaseFailed"));
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!can("module:lease_revenue:create") && !can("module:lease_revenue:update")) {
      toast.error("Permission denied");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        leaseId: parseInt(leaseId, 10),
        totalContractAmount: parseFloat(totalContractAmount),
        currencyCode,
        exchangeRate: parseFloat(exchangeRate),
        serviceStartDate,
        serviceEndDate,
        recognitionMethod,
        revenueModel,
        postingMode,
        revenueAccountId: parseInt(revenueAccountId, 10),
        deferredRevenueAccountId: deferredRevenueAccountId
          ? parseInt(deferredRevenueAccountId, 10)
          : null,
        notes,
      };
      if (isEdit && id) {
        await leaseRevenueAPI.update(parseInt(id, 10), payload);
        toast.success(t("toast.saveSuccess"));
        navigate(`/finance/lease-revenue/${id}`);
      } else {
        const res = await leaseRevenueAPI.create(payload);
        const created = res.data?.data;
        toast.success(t("toast.saveSuccess"));
        navigate(`/finance/lease-revenue/${created?.id ?? ""}`);
      }
    } catch (e) {
      toast.error(apiMessage(e) || t("toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mx-auto p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? t("form.editTitle") : t("form.newTitle")}
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("form.leaseDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>{t("form.lease")}</Label>
            <SearchableSelect
              className="mt-1"
              value={leaseId}
              onValueChange={onLeaseChange}
              options={leaseOptions}
              placeholder={t("form.selectLease")}
              disabled={readOnly}
            />
            {leases.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">{t("form.noLeases")}</p>
            )}
          </div>
          {selectedLease && (
            <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t("form.tenant")}</p>
                <p className="font-medium">{selectedLease.tenant?.name ?? "—"}</p>
                {(selectedLease.tenant?.email || selectedLease.tenant?.phone) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[selectedLease.tenant?.email, selectedLease.tenant?.phone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">{t("form.property")}</p>
                <p className="font-medium">{selectedLease.unit?.property?.title ?? "—"}</p>
                {selectedLease.unit?.property?.location && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedLease.unit.property.location}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">{t("form.unit")}</p>
                <p className="font-medium">
                  {selectedLease.unit?.unitNumber ??
                    selectedLease.unit?.unit_number ??
                    "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("form.leaseStatus")}</p>
                <p className="font-medium capitalize">{selectedLease.status ?? "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedLease.startDate
                    ? String(selectedLease.startDate).slice(0, 10)
                    : "—"}{" "}
                  →{" "}
                  {selectedLease.endDate
                    ? String(selectedLease.endDate).slice(0, 10)
                    : "—"}
                </p>
              </div>
            </div>
          )}
          {!isEdit && leaseId && can("module:lease_revenue:create") && (
            <div className="md:col-span-2">
              <Button variant="secondary" onClick={generateFromLease} disabled={generating}>
                {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Sparkles className="h-4 w-4 mr-2" />
                {t("form.generateFromLease")}
              </Button>
            </div>
          )}
          <div>
            <Label>{t("form.totalAmount")}</Label>
            <Input
              type="number"
              step="0.01"
              className="mt-1"
              value={totalContractAmount}
              onChange={(e) => setTotalContractAmount(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>{t("form.currency")}</Label>
            <Input
              className="mt-1"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>{t("form.exchangeRate")}</Label>
            <Input
              type="number"
              step="0.000001"
              className="mt-1"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>{t("form.serviceStart")}</Label>
            <Input
              type="date"
              className="mt-1"
              value={serviceStartDate}
              onChange={(e) => setServiceStartDate(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>{t("form.serviceEnd")}</Label>
            <Input
              type="date"
              className="mt-1"
              value={serviceEndDate}
              onChange={(e) => setServiceEndDate(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>{t("form.revenueModel")}</Label>
            <select
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={revenueModel}
              onChange={(e) => setRevenueModel(e.target.value)}
              disabled={readOnly}
            >
              <option value="DEFERRED">{t("form.revenueModels.DEFERRED")}</option>
              <option value="ACCRUED">{t("form.revenueModels.ACCRUED")}</option>
              <option value="DIRECT">{t("form.revenueModels.DIRECT")}</option>
            </select>
          </div>
          <div>
            <Label>{t("form.recognitionMethod")}</Label>
            <select
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={recognitionMethod}
              onChange={(e) => setRecognitionMethod(e.target.value)}
              disabled={readOnly}
            >
              <option value="DAILY_CALENDAR_MONTH">{t("form.methods.DAILY_CALENDAR_MONTH")}</option>
              <option value="EQUAL_MONTHLY">{t("form.methods.EQUAL_MONTHLY")}</option>
            </select>
          </div>
          <div>
            <Label>{t("form.postingMode")}</Label>
            <select
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={postingMode}
              onChange={(e) => setPostingMode(e.target.value)}
              disabled={readOnly}
            >
              <option value="AUTO_CREATE_DRAFT_JV">{t("form.postingModes.AUTO_CREATE_DRAFT_JV")}</option>
              <option value="MANUAL_POST">{t("form.postingModes.MANUAL_POST")}</option>
            </select>
          </div>
          <div>
            <Label>{t("form.revenueAccount")}</Label>
            <SearchableSelect
              className="mt-1"
              value={revenueAccountId}
              onValueChange={setRevenueAccountId}
              options={revenueAccounts.map(accountOption)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>{t("form.deferredRevenueAccount")}</Label>
            <SearchableSelect
              className="mt-1"
              value={deferredRevenueAccountId}
              onValueChange={setDeferredRevenueAccountId}
              options={liabilityAccounts.map(accountOption)}
              disabled={readOnly}
            />
          </div>
          <div className="md:col-span-2">
            <Label>{t("form.notes")}</Label>
            <Textarea
              className="mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("form.schedulePreview")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {previewSummary.lineCount} lines · {previewSummary.totalDays} days ·{" "}
            {previewSummary.totalAmount}
          </p>
        </CardHeader>
        <CardContent>
          {schedulePreview.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("detail.noSchedule")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("form.lineNumber")}</TableHead>
                  <TableHead>{t("form.period")}</TableHead>
                  <TableHead>{t("form.days")}</TableHead>
                  <TableHead>{t("form.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedulePreview.map((line) => (
                  <TableRow key={line.lineNumber}>
                    <TableCell>{line.lineNumber}</TableCell>
                    <TableCell>
                      {line.periodStart} — {line.periodEnd}
                    </TableCell>
                    <TableCell>{line.serviceDays}</TableCell>
                    <TableCell className="font-mono">{line.scheduledAmount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t("common.back")}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("form.save")}
          </Button>
        </div>
      )}
    </div>
  );
}
