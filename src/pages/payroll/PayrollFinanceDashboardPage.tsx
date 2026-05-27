import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollPageShell } from "@/components/payroll";

export default function PayrollFinanceDashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    payrollAPI.finance.dashboard().then((r) => setData(r.data?.data));
  }, []);

  return (
    <PayrollPageShell
      title="Payroll finance"
      description="GL posting, reconciliation exceptions, and WPS clearing."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Finance" },
      ]}
      showPeriod={false}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payroll payable (GL)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.payroll_payable_balance ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unposted runs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.unposted_runs ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unposted settlements</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.unposted_settlements ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Posted runs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.posted_runs ?? "—"}</CardContent>
        </Card>
      </div>
      {data?.exceptions?.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle>Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {data.exceptions.map((ex: any, i: number) => (
                <li key={i}>
                  {ex.type}
                  {ex.count != null ? ` (${ex.count})` : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/people/payroll/account-config">GL account configuration</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/employee-ledger">Employee ledger</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/posting-register">Posting register</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/finance-reconciliation">GL reconciliation</Link>
        </Button>
      </div>
    </PayrollPageShell>
  );
}
