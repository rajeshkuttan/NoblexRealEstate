import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollPageShell, ExceptionQueueTable, type ExceptionItem } from "@/components/payroll";

export default function PayrollWpsCompliancePage() {
  const { t } = useTranslation();
  const [runId, setRunId] = useState("");
  const [runs, setRuns] = useState<any[]>([]);
  const [issues, setIssues] = useState<ExceptionItem[]>([]);
  const [bankIssues, setBankIssues] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.processing.runs.list().then((r) => {
      setRuns((r.data?.data ?? []).filter((x: any) => ["APPROVED", "LOCKED"].includes(x.status)));
    });
    payrollAPI.wps.reports.bankValidation().then((r) => setBankIssues(r.data?.data ?? []));
    payrollAPI.documents.listExpiring({ days: 30 }).then((r) => {
      const docs = r.data?.data ?? [];
      setIssues((prev) => [
        ...prev,
        ...docs.slice(0, 20).map((d: any) => ({
          employee_id: d.employeeId,
          employee_name: d.employee?.employeeName,
          issue: `Document expiring: ${d.documentType}`,
          severity: "medium" as const,
          action_href: "/people/payroll/documents",
        })),
      ]);
    });
  }, []);

  const check = async () => {
    if (!runId) return;
    const r = await payrollAPI.wps.compliance({ payroll_run_id: Number(runId) });
    const list = r.data?.data?.issues ?? [];
    setIssues(
      list.map((i: any) => ({
        employee_name: i.employeeNo,
        issue: i.message,
        severity: i.severity === "ERROR" ? "high" : "medium",
      }))
    );
  };

  return (
    <PayrollPageShell
      title={t("payroll.pages.wpsCompliance")}
      description="Missing IBAN/MOL, expired documents, GPSSA and emiratisation indicators."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "WPS", href: "/people/payroll/wps" },
        { label: "Compliance" },
      ]}
      showPeriod={false}
    >
      <div className="flex gap-2 items-center flex-wrap">
        <select
          className="border rounded px-2 py-1 text-sm min-w-[200px]"
          value={runId}
          onChange={(e) => setRunId(e.target.value)}
        >
          <option value="">Select payroll run…</option>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              Run #{r.runNumber} ({r.status})
            </option>
          ))}
        </select>
        <Button onClick={check}>Run compliance check</Button>
        <Button variant="outline" asChild>
          <Link to="/people/payroll/emiratisation">Emiratisation</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/people/payroll/gpssa">GPSSA</Link>
        </Button>
      </div>

      <ExceptionQueueTable items={issues} />

      {bankIssues.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Bank validation ({bankIssues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {bankIssues.slice(0, 30).map((b: any, i: number) => (
                <li key={i}>
                  {b.employeeNo ?? b.employee_id}: {b.message ?? b.issue ?? JSON.stringify(b)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PayrollPageShell>
  );
}
