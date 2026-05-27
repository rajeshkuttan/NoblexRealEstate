import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { PayrollPageShell, PayrollKpiGrid, PayrollKpiCard, PayrollDataTable, PayrollStatusBadge } from "@/components/payroll";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PayrollLeaveDashboardPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.leaveApplications.list({ status: "SUBMITTED" }).then((r) => setPending(r.data?.data ?? []));
    payrollAPI.reports.leaveBalance({}).then((r) => setBalances(r.data?.data ?? []));
    payrollAPI.reports.leaveTransaction({}).then((r) => setTransactions((r.data?.data ?? []).slice(0, 20)));
  }, []);

  const onLeaveToday = transactions.filter((t) => {
    const today = new Date().toISOString().slice(0, 10);
    return t.status === "APPROVED" && t.fromDate <= today && t.toDate >= today;
  });

  return (
    <PayrollPageShell
      title="Leave dashboard"
      description="Balances, pending approvals, and employees on leave today."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Leave" },
      ]}
      showPeriod={false}
      actions={
        <Button size="sm" asChild>
          <Link to="/people/payroll/leave-applications">All applications</Link>
        </Button>
      }
    >
      <PayrollKpiGrid>
        <PayrollKpiCard title="Pending approvals" value={pending.length} href="/people/payroll/leave-applications?status=SUBMITTED" />
        <PayrollKpiCard title="On leave today" value={onLeaveToday.length} />
        <PayrollKpiCard title="Balance records" value={balances.length} />
      </PayrollKpiGrid>

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <PayrollDataTable
              columns={[
                { key: "e", header: "Employee", cell: (r: any) => r.employee?.employeeName },
                { key: "f", header: "From", cell: (r: any) => r.fromDate },
                { key: "d", header: "Days", cell: (r: any) => r.totalDays },
              ]}
              data={pending.slice(0, 10)}
              getRowKey={(r: any) => r.id}
              emptyMessage="No pending leave."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <PayrollDataTable
              columns={[
                { key: "e", header: "Employee", cell: (r: any) => r.employee?.employeeName },
                { key: "s", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
              ]}
              data={transactions}
              getRowKey={(r: any) => r.id}
            />
          </CardContent>
        </Card>
      </div>
    </PayrollPageShell>
  );
}
