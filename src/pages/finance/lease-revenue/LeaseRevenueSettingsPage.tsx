import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { leaseRevenueAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiMessage } from "./LeaseRevenueRegisterPage";

export default function LeaseRevenueSettingsPage() {
  const { t } = useTranslation("leaseRevenue");
  const { can } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultRecognitionMethod, setDefaultRecognitionMethod] = useState("DAILY_CALENDAR_MONTH");
  const [defaultPostingMode, setDefaultPostingMode] = useState("AUTO_CREATE_DRAFT_JV");
  const [defaultRevenueModel, setDefaultRevenueModel] = useState("DEFERRED");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settingsRes = await leaseRevenueAPI.getSettings();
      const settings = settingsRes.data?.data;
      if (settings) {
        setDefaultRecognitionMethod(
          settings.defaultRecognitionMethod ?? settings.default_recognition_method ?? "DAILY_CALENDAR_MONTH"
        );
        setDefaultPostingMode(
          settings.defaultPostingMode ?? settings.default_posting_mode ?? "AUTO_CREATE_DRAFT_JV"
        );
        setDefaultRevenueModel(
          settings.defaultRevenueModel ?? settings.default_revenue_model ?? "DEFERRED"
        );
      }
    } catch {
      toast.error(t("toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!can("module:lease_revenue:settings")) {
      toast.error("Permission denied");
      return;
    }
    setSaving(true);
    try {
      await leaseRevenueAPI.updateSettings({
        defaultRecognitionMethod,
        defaultPostingMode,
        defaultRevenueModel,
      });
      toast.success(t("toast.settingsSaved"));
    } catch (e) {
      toast.error(apiMessage(e) || t("toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("settings.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("common.refresh")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 max-w-lg">
          {loading ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <>
              <div>
                <Label>{t("settings.defaultRevenueModel")}</Label>
                <select
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={defaultRevenueModel}
                  onChange={(e) => setDefaultRevenueModel(e.target.value)}
                  disabled={!can("module:lease_revenue:settings")}
                >
                  <option value="DEFERRED">{t("form.revenueModels.DEFERRED")}</option>
                  <option value="ACCRUED">{t("form.revenueModels.ACCRUED")}</option>
                  <option value="DIRECT">{t("form.revenueModels.DIRECT")}</option>
                </select>
              </div>
              <div>
                <Label>{t("settings.defaultRecognitionMethod")}</Label>
                <select
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={defaultRecognitionMethod}
                  onChange={(e) => setDefaultRecognitionMethod(e.target.value)}
                  disabled={!can("module:lease_revenue:settings")}
                >
                  <option value="DAILY_CALENDAR_MONTH">{t("form.methods.DAILY_CALENDAR_MONTH")}</option>
                  <option value="EQUAL_MONTHLY">{t("form.methods.EQUAL_MONTHLY")}</option>
                </select>
              </div>
              <div>
                <Label>{t("settings.defaultPostingMode")}</Label>
                <select
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={defaultPostingMode}
                  onChange={(e) => setDefaultPostingMode(e.target.value)}
                  disabled={!can("module:lease_revenue:settings")}
                >
                  <option value="AUTO_CREATE_DRAFT_JV">{t("form.postingModes.AUTO_CREATE_DRAFT_JV")}</option>
                  <option value="MANUAL_POST">{t("form.postingModes.MANUAL_POST")}</option>
                </select>
              </div>
              {can("module:lease_revenue:settings") && (
                <Button onClick={save} disabled={saving}>
                  {t("settings.save")}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
