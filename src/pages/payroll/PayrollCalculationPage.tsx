import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollPageShell, PayrollStatusBadge } from "@/components/payroll";

export default function PayrollCalculationPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.processing.dashboard().then((r) => setData(r.data?.data));
    payrollAPI.processing.runs.list().then((r) => setRuns(r.data?.data ?? []));
  }, []);

  const run = data?.run;

  return (
    <PayrollPageShell
      title={t("payroll.pages.calculation")}
      description="Period launcher — open a run for the full calculation workspace."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Calculation" },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Employees processed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{run?.total_employees ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gross salary</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{run?.total_gross ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deductions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{run?.total_deductions ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Net salary</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{run?.total_net ?? "—"}</CardContent>
        </Card>
      </div>
      {data?.exceptions?.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle>Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm list-disc pl-5 space-y-1">
              {data.exceptions.map((ex: any, i: number) => (
                <li key={i}>
                  {ex.employeeName}: {ex.issue}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {run?.id && (
        <Button asChild>
          <Link to={`/people/payroll/runs/${run.id}`}>Open active run workspace</Link>
        </Button>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b py-2 text-sm">
              <span>
                Run #{r.runNumber} · {r.payrollPeriod?.periodMonth}/{r.payrollPeriod?.periodYear}
              </span>
              <div className="flex items-center gap-2">
                <PayrollStatusBadge status={r.status} />
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/people/payroll/runs/${r.id}`}>Open</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/people/payroll/register">Register</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/variance">Variance</Link>
        </Button>
      </div>
    </PayrollPageShell>
  );
}
