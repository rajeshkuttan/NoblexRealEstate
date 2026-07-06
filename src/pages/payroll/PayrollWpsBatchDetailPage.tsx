import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { payrollAPI } from "@/services/api";
import {
  PayrollPageShell,
  PayrollStatusBadge,
  WorkflowActionBar,
  PayrollDataTable,
  AuditTimelineDrawer,
} from "@/components/payroll";
import { usePayrollPermissions } from "@/hooks/payroll/usePayrollPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PayrollWpsBatchDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const batchId = Number(id);
  const perms = usePayrollPermissions();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const load = () => payrollAPI.workspace.wpsBatchDetail(batchId).then((r) => setData(r.data?.data));

  useEffect(() => {
    if (batchId) load();
  }, [batchId]);

  const batch = data?.batch;
  const status = batch?.status;
  const lines = batch?.lines ?? batch?.employeeLines ?? [];

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      toast.success(label);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const validate = async () => {
    if (!batch?.payrollRunId) return;
    setBusy("validate");
    try {
      const r = await payrollAPI.wps.compliance({ payroll_run_id: batch.payrollRunId });
      setData((prev: any) => ({ ...prev, compliance: r.data?.data }));
      toast.success("Validation complete");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Validation failed");
    } finally {
      setBusy(null);
    }
  };

  const exportSif = async () => {
    setBusy("export");
    try {
      const r = await payrollAPI.wps.batches.export(batchId);
      const payload = r.data?.data;
      if (payload?.content) {
        const blob = new Blob([payload.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = payload.file_name || `wps_${batchId}.sif`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success("SIF exported");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const issues = data?.compliance?.issues ?? data?.compliance?.errors ?? [];
  const warnings = data?.compliance?.warnings ?? [];

  return (
    <PayrollPageShell
      title={t("payroll.pages.wpsBatchDetail", { id: batch?.batchNumber ?? id })}
      description={`Run ${batch?.payrollRunId ?? "—"} · ${batch?.totalEmployees ?? lines.length} employees · AED ${batch?.totalAmount ?? batch?.totalNetAmount ?? "—"}`}
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "WPS", href: "/people/payroll/wps" },
        { label: `Batch ${id}` },
      ]}
      showPeriod={false}
      actions={
        <>
          <PayrollStatusBadge status={status} />
          <WorkflowActionBar
            actions={[
              {
                id: "validate",
                label: "Validate",
                hidden: !perms.wps.view,
                loading: busy === "validate",
                onClick: validate,
              },
              {
                id: "review",
                label: "Review",
                hidden: !perms.wps.manage,
                loading: busy === "review",
                onClick: () => act("review", () => payrollAPI.wps.batches.review(batchId)),
              },
              {
                id: "approve",
                label: "Approve",
                hidden: !perms.wps.approve,
                loading: busy === "approve",
                onClick: () => act("approve", () => payrollAPI.wps.batches.approve(batchId)),
              },
              {
                id: "export",
                label: "Export SIF",
                hidden: !perms.wps.approve,
                loading: busy === "export",
                onClick: exportSif,
              },
            ]}
          />
          <button type="button" className="text-sm underline" onClick={() => setAuditOpen(true)}>
            Audit
          </button>
        </>
      }
    >
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="employees">Employees ({lines.length})</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="sif">SIF export</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total amount</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold">{batch?.totalAmount ?? batch?.totalNetAmount ?? "—"}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Salary month</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-bold">
                {batch?.salaryMonth}/{batch?.salaryYear}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SIF file</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">{batch?.sifFileName ?? "Not exported"}</CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="employees" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "emp", header: "Employee", cell: (r: any) => r.employeeName ?? r.employee?.employeeName },
              { key: "iban", header: "IBAN", cell: (r: any) => r.iban ?? "—" },
              { key: "net", header: "Net", cell: (r: any) => r.netSalary ?? r.amount },
              {
                key: "st",
                header: "Status",
                cell: (r: any) => <PayrollStatusBadge status={r.validationStatus ?? r.status} />,
              },
            ]}
            data={lines}
            getRowKey={(r: any) => String(r.id ?? r.employeeId)}
          />
        </TabsContent>
        <TabsContent value="validation" className="mt-4 space-y-4">
          {Array.isArray(issues) && issues.length > 0 && (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Blocking ({issues.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  {issues.map((i: any, idx: number) => (
                    <li key={idx}>{typeof i === "string" ? i : i.message ?? JSON.stringify(i)}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {warnings.length > 0 && (
            <Card className="border-amber-500/40">
              <CardHeader>
                <CardTitle className="text-base">Warnings ({warnings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  {warnings.map((w: string, idx: number) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {!issues.length && !warnings.length && (
            <p className="text-sm text-muted-foreground">Run Validate to check compliance for the linked payroll run.</p>
          )}
        </TabsContent>
        <TabsContent value="sif" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Export generates the SIF file for bank submission. Batch must be approved before export.
          </p>
          <Button onClick={exportSif} disabled={!perms.wps.approve || busy === "export"}>
            Download SIF
          </Button>
          {batch?.sifFileName && <p className="text-sm">Last file: {batch.sifFileName}</p>}
        </TabsContent>
      </Tabs>
      <AuditTimelineDrawer open={auditOpen} onOpenChange={setAuditOpen} entityType="batch" entityId={batchId} />
    </PayrollPageShell>
  );
}
