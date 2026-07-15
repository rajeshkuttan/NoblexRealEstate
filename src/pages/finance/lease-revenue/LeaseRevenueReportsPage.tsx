import { useState } from "react";
import { useTranslation } from "react-i18next";
import { leaseRevenueAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiMessage } from "./LeaseRevenueRegisterPage";

const REPORT_TYPES = [
  "register",
  "schedule",
  "recognition",
  "monthly_recognition",
  "deferred",
  "forecast",
  "reconciliation",
  "exceptions",
] as const;

const FORMATS = ["json", "xlsx", "csv", "pdf"] as const;

export default function LeaseRevenueReportsPage() {
  const { t } = useTranslation("leaseRevenue");
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]>("register");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("xlsx");
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const res = await leaseRevenueAPI.getReport(reportType, { format });
      if (format === "json") {
        const data = res.data?.data ?? res.data;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lease-revenue-${reportType}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = res.data as Blob;
        const contentType = format === "pdf" ? "application/pdf" : undefined;
        const fileBlob = blob instanceof Blob ? blob : new Blob([blob], { type: contentType });
        const url = URL.createObjectURL(fileBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lease-revenue-${reportType}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(t("toast.downloadSuccess"));
    } catch (e) {
      toast.error(apiMessage(e) || t("toast.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("reports.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("reports.download")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div>
            <Label>{t("reports.reportType")}</Label>
            <select
              className="mt-1 block min-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as (typeof REPORT_TYPES)[number])}
            >
              {REPORT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`reports.types.${type}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>{t("reports.format")}</Label>
            <select
              className="mt-1 block min-w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={format}
              onChange={(e) => setFormat(e.target.value as (typeof FORMATS)[number])}
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={download} disabled={downloading}>
            {t("reports.download")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
