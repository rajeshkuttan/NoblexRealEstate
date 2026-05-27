import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollPageShell } from "@/components/payroll";

export default function PayrollFinanceReconciliationPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    payrollAPI.finance.reconciliation().then((r) => setData(r.data?.data));
  }, []);

  return (
    <PayrollPageShell
      title="GL reconciliation"
      description="Exception-first reconciliation between payroll totals and GL balances."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Finance", href: "/people/payroll/finance" },
        { label: "Reconciliation" },
      ]}
      showPeriod={false}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payable balance</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{data?.payroll_payable_balance ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Loan balances</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{data?.employee_loan_balance_total ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Config active</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{data?.has_config ? "Yes" : "No"}</CardContent>
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
                <li key={i}>{JSON.stringify(ex)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PayrollPageShell>
  );
}
