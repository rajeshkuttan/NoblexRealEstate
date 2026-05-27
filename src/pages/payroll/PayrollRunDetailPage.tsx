import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import {
  PayrollPageShell,
  PayrollStatusBadge,
  WorkflowActionBar,
  PayrollDataTable,
  AuditTimelineDrawer,
  PayrollRunEmployeeDrawer,
} from "@/components/payroll";
import { usePayrollPermissions } from "@/hooks/payroll/usePayrollPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const runId = Number(id);
  const perms = usePayrollPermissions();
  const [detail, setDetail] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [drawerEmp, setDrawerEmp] = useState<{ id: number; name: string } | null>(null);

  const load = () => {
    payrollAPI.workspace.runDetail(runId).then((r) => setDetail(r.data?.data));
  };

  useEffect(() => {
    if (runId) load();
  }, [runId]);

  const run = detail?.run;
  const status = run?.status;

  const runAction = async (action: string, fn: () => Promise<unknown>) => {
    setBusy(action);
    try {
      await fn();
      toast.success(`Payroll ${action} completed`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? `Failed to ${action}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <PayrollPageShell
      title={`Payroll run #${run?.runNumber ?? id}`}
      description={run?.payrollPeriod ? `Period ${run.payrollPeriod.periodMonth}/${run.payrollPeriod.periodYear}` : ""}
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Calculation", href: "/people/payroll/calculation" },
        { label: `Run ${id}` },
      ]}
      showPeriod={false}
      actions={
        <>
          <PayrollStatusBadge status={status} />
          <WorkflowActionBar
            actions={[
              {
                id: "calc",
                label: "Calculate",
                hidden: !perms.processing.manage,
                disabled: status === "LOCKED",
                loading: busy === "calculate",
                onClick: () => runAction("calculate", () => payrollAPI.processing.runs.calculate(runId)),
              },
              {
                id: "approve",
                label: "Approve",
                hidden: !perms.processing.approve,
                disabled: status !== "CALCULATED",
                loading: busy === "approve",
                onClick: () => runAction("approve", () => payrollAPI.processing.runs.approve(runId)),
              },
              {
                id: "lock",
                label: "Lock",
                hidden: !perms.processing.approve,
                disabled: status !== "APPROVED",
                loading: busy === "lock",
                confirm: { title: "Lock payroll run?", description: "Locked runs cannot be recalculated." },
                onClick: () => runAction("lock", () => payrollAPI.processing.runs.lock(runId)),
              },
              {
                id: "reverse",
                label: "Reverse",
                variant: "destructive",
                hidden: !perms.processing.approve,
                loading: busy === "reverse",
                confirm: { title: "Reverse payroll run?", description: "This creates a reversal record." },
                onClick: () => runAction("reverse", () => payrollAPI.processing.runs.reverse(runId)),
              },
            ]}
          />
          <button type="button" className="text-sm underline" onClick={() => setAuditOpen(true)}>
            Audit
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Employees</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{detail?.totals?.employees ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gross</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{detail?.totals?.gross ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deductions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{detail?.totals?.deductions ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Net</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{detail?.totals?.net ?? "—"}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="mt-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="components">Component breakdown</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions ({detail?.totals?.exception_count ?? 0})</TabsTrigger>
          <TabsTrigger value="variance">Variance</TabsTrigger>
          <TabsTrigger value="wps">WPS</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "name", header: "Employee", cell: (r: any) => r.employee?.employeeName },
              { key: "gross", header: "Gross", cell: (r: any) => r.grossSalary },
              { key: "net", header: "Net", cell: (r: any) => r.netSalary },
              { key: "status", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
            ]}
            data={detail?.register ?? []}
            getRowKey={(r: any) => r.id}
            onRowClick={(r) =>
              setDrawerEmp({ id: r.employeeId, name: r.employee?.employeeName ?? "" })
            }
          />
        </TabsContent>
        <TabsContent value="components" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "code", header: "Component", cell: (r: any) => r.component_name ?? r.component_code },
              { key: "type", header: "Type", cell: (r: any) => r.component_type },
              { key: "total", header: "Total", cell: (r: any) => r.total },
            ]}
            data={detail?.component_breakdown ?? []}
            getRowKey={(r: any) => r.component_code}
          />
        </TabsContent>
        <TabsContent value="exceptions" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "name", header: "Employee", cell: (r: any) => r.employee?.employeeName },
              { key: "status", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
            ]}
            data={detail?.exceptions ?? []}
            getRowKey={(r: any) => r.id}
            emptyMessage="No calculation exceptions."
          />
        </TabsContent>
        <TabsContent value="variance" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "name", header: "Employee", cell: (r: any) => r.employee?.employeeName },
              { key: "prev", header: "Previous net", cell: (r: any) => r.previous_net },
              { key: "curr", header: "Current net", cell: (r: any) => r.current_net },
              { key: "var", header: "Variance", cell: (r: any) => r.variance },
            ]}
            data={detail?.variance ?? []}
            getRowKey={(r: any) => r.employee?.id ?? r.employeeId}
            emptyMessage="No prior period run for variance comparison."
          />
        </TabsContent>
        <TabsContent value="wps" className="mt-4">
          <Link to="/people/payroll/wps/batches" className="text-sm text-primary underline">
            Open WPS batches for this run
          </Link>
        </TabsContent>
      </Tabs>

      <PayrollRunEmployeeDrawer
        open={!!drawerEmp}
        onOpenChange={(o) => !o && setDrawerEmp(null)}
        runId={runId}
        employeeId={drawerEmp?.id ?? null}
        employeeName={drawerEmp?.name}
      />
      <AuditTimelineDrawer open={auditOpen} onOpenChange={setAuditOpen} entityType="run" entityId={runId} />
    </PayrollPageShell>
  );
}
