import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { chartOfAccountsAPI, prepaidExpensesAPI } from "@/services/api";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateMonthlySchedulePreview,
  previewScheduleSummary,
} from "./prepaidSchedulePreview";
import { apiMessage } from "./PrepaidExpenseRegisterPage";

const accountOption = (a: { id: number; accountCode: string; accountName: string }) => ({
  value: String(a.id),
  label: `${a.accountCode} - ${a.accountName}`,
});

export default function PrepaidExpenseFormPage() {
  const { t } = useTranslation("prepaid");
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { can } = useAuth();

  const [fetching, setFetching] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [assetAccounts, setAssetAccounts] = useState<any[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);

  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState("AED");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [serviceStartDate, setServiceStartDate] = useState("");
  const [serviceEndDate, setServiceEndDate] = useState("");
  const [recognitionMethod, setRecognitionMethod] = useState("DAILY_CALENDAR_MONTH");
  const [postingMode, setPostingMode] = useState("AUTO_CREATE_DRAFT_JV");
  const [prepaidAssetAccountId, setPrepaidAssetAccountId] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [recordStatus, setRecordStatus] = useState("DRAFT");

  const readOnly = isEdit && !["DRAFT", "SCHEDULE_GENERATED"].includes(recordStatus);

  const schedulePreview = useMemo(
    () =>
      calculateMonthlySchedulePreview(totalAmount, serviceStartDate, serviceEndDate),
    [totalAmount, serviceStartDate, serviceEndDate]
  );
  const previewSummary = useMemo(() => previewScheduleSummary(schedulePreview), [schedulePreview]);

  const loadMaster = useCallback(async () => {
    const res = await chartOfAccountsAPI.getAll({ limit: 500 });
    const list = res.data?.data?.accounts ?? res.data?.data ?? [];
    const accounts = Array.isArray(list) ? list : [];
    // Prefer postable leaf accounts: exclude headers that expose nested children.
    const isLeaf = (a: any) =>
      !(Array.isArray(a.subAccounts) && a.subAccounts.length > 0);
    setAssetAccounts(
      accounts.filter((a: any) => a.accountType === "asset" && a.isActive !== false && isLeaf(a))
    );
    setExpenseAccounts(
      accounts.filter((a: any) => a.accountType === "expense" && a.isActive !== false && isLeaf(a))
    );
  }, []);

  const loadRecord = useCallback(async () => {
    if (!id) return;
    setFetching(true);
    try {
      const res = await prepaidExpensesAPI.getById(parseInt(id, 10));
      const r = res.data?.data;
      if (!r) throw new Error("Not found");
      setDescription(r.description ?? "");
      setTotalAmount(String(r.totalAmount ?? ""));
      setCurrencyCode(r.currencyCode ?? "AED");
      setExchangeRate(String(r.exchangeRate ?? 1));
      setServiceStartDate(String(r.serviceStartDate).slice(0, 10));
      setServiceEndDate(String(r.serviceEndDate).slice(0, 10));
      setRecognitionMethod(r.recognitionMethod ?? "DAILY_CALENDAR_MONTH");
      setPostingMode(r.postingMode ?? "AUTO_CREATE_DRAFT_JV");
      setPrepaidAssetAccountId(String(r.prepaidAssetAccountId ?? ""));
      setExpenseAccountId(String(r.expenseAccountId ?? ""));
      setNotes(r.notes ?? "");
      setRecordStatus(r.status ?? "DRAFT");
    } catch {
      toast.error(t("toast.loadFailed"));
      navigate("/finance/prepaid-expenses");
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

  const save = async () => {
    if (!can("module:prepaid_expenses:create") && !can("module:prepaid_expenses:update")) {
      toast.error("Permission denied");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description,
        totalAmount: parseFloat(totalAmount),
        currencyCode,
        exchangeRate: parseFloat(exchangeRate),
        serviceStartDate,
        serviceEndDate,
        recognitionMethod,
        postingMode,
        prepaidAssetAccountId: parseInt(prepaidAssetAccountId, 10),
        expenseAccountId: parseInt(expenseAccountId, 10),
        notes,
      };
      if (isEdit && id) {
        await prepaidExpensesAPI.update(parseInt(id, 10), payload);
        toast.success(t("toast.saveSuccess"));
        navigate(`/finance/prepaid-expenses/${id}`);
      } else {
        const res = await prepaidExpensesAPI.create(payload);
        const created = res.data?.data;
        toast.success(t("toast.saveSuccess"));
        navigate(`/finance/prepaid-expenses/${created?.id ?? ""}`);
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
          <CardTitle>{t("form.description")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>{t("form.description")}</Label>
            <Textarea
              className="mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>{t("form.totalAmount")}</Label>
            <Input
              type="number"
              step="0.01"
              className="mt-1"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
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
            <Label>{t("form.prepaidAssetAccount")}</Label>
            <SearchableSelect
              className="mt-1"
              value={prepaidAssetAccountId}
              onValueChange={setPrepaidAssetAccountId}
              options={assetAccounts.map(accountOption)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>{t("form.expenseAccount")}</Label>
            <SearchableSelect
              className="mt-1"
              value={expenseAccountId}
              onValueChange={setExpenseAccountId}
              options={expenseAccounts.map(accountOption)}
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
