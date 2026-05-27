import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import {
  PayrollPageShell,
  PayrollKpiGrid,
  PayrollKpiCard,
} from "@/components/payroll";
import { usePayrollPeriod } from "@/hooks/payroll/usePayrollPeriod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  CalendarCheck,
  Calculator,
  Shield,
  HandCoins,
  Landmark,
  FileStack,
  AlertTriangle,
} from "lucide-react";

const navLinks = [
  { title: "Employees", href: "/people/payroll/employees" },
  { title: "Attendance control", href: "/people/payroll/attendance-control" },
  { title: "Calculation", href: "/people/payroll/calculation" },
  { title: "WPS", href: "/people/payroll/wps" },
  { title: "Settlements", href: "/people/payroll/final-settlement" },
  { title: "Finance", href: "/people/payroll/finance" },
  { title: "Documents", href: "/people/payroll/documents-hub" },
  { title: "Reports", href: "/people/payroll/reports" },
  { title: "Leave", href: "/people/payroll/leave-dashboard" },
  { title: "Organization", href: "/people/payroll/organization" },
];

export default function PayrollHubPage() {
  const { month, year, periodParams } = usePayrollPeriod();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    payrollAPI.workspace
      .commandCenter(periodParams)
      .then((r) => setData(r.data?.data))
      .catch(async () => {
        const [ops, calc, wps, fin, docs] = await Promise.allSettled([
          payrollAPI.operations.dashboard(periodParams),
          payrollAPI.processing.dashboard({}),
          payrollAPI.wps.dashboard(),
          payrollAPI.finance.dashboard(),
          payrollAPI.documentsHub.dashboard(),
        ]);
        setData({
          kpis: {
            active_employees: "—",
            pending_leave: ops.status === "fulfilled" ? ops.value.data?.data?.pending_leave_approvals : "—",
            runs_pending: calc.status === "fulfilled" ? (calc.value.data?.data?.run ? 1 : 0) : "—",
            wps_pending: 0,
            finance_unposted: fin.status === "fulfilled" ? fin.value.data?.data?.unposted_runs : "—",
            expiring_documents: 0,
          },
          readiness: ops.status === "fulfilled" ? ops.value.data?.data : null,
          action_queue: [],
          _fallback: true,
        });
      })
      .finally(() => setLoading(false));
  }, [month, year, periodParams]);

  const kpis = data?.kpis ?? {};
  const queue: { id: string; label: string; href: string; priority?: string }[] = data?.action_queue ?? [];

  return (
    <PayrollPageShell
      title="Payroll command center"
      description="UAE real estate payroll workspace — period context drives all KPIs and actions."
      backHref={undefined}
      showPeriod
    >
      <PayrollKpiGrid>
        <PayrollKpiCard
          title="Active employees"
          value={loading ? "…" : kpis.active_employees ?? "—"}
          icon={Users}
          href="/people/payroll/employees"
        />
        <PayrollKpiCard
          title="Attendance readiness"
          value={loading ? "…" : data?.readiness?.ready_for_payroll ? "Ready" : "Blocked"}
          variant={data?.readiness?.ready_for_payroll ? "success" : "warning"}
          icon={CalendarCheck}
          href="/people/payroll/attendance-control"
        />
        <PayrollKpiCard
          title="Pending leave"
          value={loading ? "…" : kpis.pending_leave ?? 0}
          href="/people/payroll/leave-applications?status=SUBMITTED"
        />
        <PayrollKpiCard
          title="Runs pending"
          value={loading ? "…" : kpis.runs_pending ?? 0}
          icon={Calculator}
          href="/people/payroll/calculation"
        />
        <PayrollKpiCard
          title="WPS pending"
          value={loading ? "…" : kpis.wps_pending ?? 0}
          icon={Shield}
          href="/people/payroll/wps/batches"
        />
        <PayrollKpiCard
          title="Settlements"
          value={loading ? "…" : kpis.settlements_pending ?? 0}
          icon={HandCoins}
          href="/people/payroll/final-settlements"
        />
        <PayrollKpiCard
          title="GL unposted"
          value={loading ? "…" : kpis.finance_unposted ?? 0}
          icon={Landmark}
          href="/people/payroll/finance"
        />
        <PayrollKpiCard
          title="Doc expiry"
          value={loading ? "…" : kpis.expiring_documents ?? 0}
          icon={FileStack}
          href="/people/payroll/documents"
          variant={(kpis.expiring_documents ?? 0) > 0 ? "warning" : "default"}
        />
      </PayrollKpiGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Action queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && queue.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending actions for {month}/{year}.</p>
            )}
            {queue.map((item) => (
              <Button key={item.id} variant="outline" className="w-full justify-start" asChild>
                <Link to={item.href}>{item.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {navLinks.map((l) => (
                <Button key={l.href} variant="secondary" size="sm" asChild>
                  <Link to={l.href}>{l.title}</Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {data?.readiness?.blocking_issues?.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="text-base">Blocking issues</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm list-disc pl-5 space-y-1">
              {data.readiness.blocking_issues.map((b: string, i: number) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PayrollPageShell>
  );
}
