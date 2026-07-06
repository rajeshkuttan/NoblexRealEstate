import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PayrollPageShell, PayrollKpiGrid, PayrollKpiCard, PayrollDataTable, PayrollStatusBadge } from "@/components/payroll";
import { usePayrollPermissions } from "@/hooks/payroll/usePayrollPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function PayrollDocumentsHubPage() {
  const { t } = useTranslation();
  const perms = usePayrollPermissions();
  const [data, setData] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [runId, setRunId] = useState("");

  const load = () => {
    payrollAPI.documentsHub.dashboard().then((r) => setData(r.data?.data));
    payrollAPI.documentsHub.payslips.list().then((r) => setPayslips(r.data?.data ?? []));
    payrollAPI.documentsHub.distribution.queue().then((r) => setQueue(r.data?.data ?? []));
  };

  useEffect(load, []);

  const batchGenerate = async () => {
    if (!runId) return toast.error("Enter payroll run ID");
    await payrollAPI.documentsHub.payslips.batch({ payroll_run_id: Number(runId) });
    toast.success("Payslip batch generated");
    load();
  };

  const publish = async () => {
    if (!runId) return toast.error("Enter payroll run ID");
    await payrollAPI.documentsHub.payslips.publish({ payroll_run_id: Number(runId) });
    toast.success("Payslips published");
    load();
  };

  return (
    <PayrollPageShell
      title={t("payroll.pages.documentsHub")}
      description="Payslip batches, publication, certificates, settlement docs, exports, and distribution."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Documents hub" },
      ]}
      showPeriod={false}
    >
      <PayrollKpiGrid className="lg:grid-cols-5">
        <PayrollKpiCard title={t("payroll.kpi.generatedPayslips")} value={data?.generated_payslips ?? "—"} href="/people/payroll/payslips" />
        <PayrollKpiCard title={t("payroll.kpi.pendingPublication")} value={data?.pending_publication ?? "—"} variant={(data?.pending_publication ?? 0) > 0 ? "warning" : "default"} />
        <PayrollKpiCard title={t("payroll.kpi.settlementDocs")} value={data?.settlement_documents ?? "—"} href="/people/payroll/settlement-documents" />
        <PayrollKpiCard title={t("payroll.kpi.certificates")} value={data?.salary_certificates ?? "—"} href="/people/payroll/salary-certificates" />
        <PayrollKpiCard title={t("payroll.kpi.exports")} value={data?.exports_generated ?? "—"} href="/people/payroll/exports" />
      </PayrollKpiGrid>

      <Tabs defaultValue="payslips" className="mt-6">
        <TabsList>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="batch">Batch generate / publish</TabsTrigger>
          <TabsTrigger value="distribution">Distribution queue</TabsTrigger>
          <TabsTrigger value="links">Other documents</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "n", header: "Payslip #", cell: (r: any) => r.payslipNumber },
              { key: "e", header: "Employee", cell: (r: any) => r.employeeId },
              { key: "net", header: "Net", cell: (r: any) => r.netSalary },
              { key: "s", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
            ]}
            data={payslips.slice(0, 50)}
            getRowKey={(r: any) => r.id}
            emptyMessage="No payslips yet."
          />
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          {perms.documentsHub.manage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Batch from locked payroll run</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 items-end">
                <div>
                  <Label>Payroll run ID</Label>
                  <Input value={runId} onChange={(e) => setRunId(e.target.value)} className="w-40" />
                </div>
                <Button onClick={batchGenerate}>Generate batch</Button>
                {perms.documentsHub.publish && (
                  <Button variant="secondary" onClick={publish}>
                    Publish all
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "id", header: "Queue ID", cell: (r: any) => r.id },
              { key: "s", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
              { key: "e", header: "Employee", cell: (r: any) => r.employeeId ?? "—" },
            ]}
            data={queue}
            getRowKey={(r: any) => r.id}
            emptyMessage="Distribution queue is empty."
          />
        </TabsContent>

        <TabsContent value="links" className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/people/payroll/salary-certificates">Salary certificates</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/people/payroll/settlement-documents">Settlement documents</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/people/payroll/exports">Report exports</Link>
          </Button>
        </TabsContent>
      </Tabs>
    </PayrollPageShell>
  );
}
