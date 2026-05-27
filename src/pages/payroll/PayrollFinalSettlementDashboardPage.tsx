import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function PayrollFinalSettlementDashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    payrollAPI.settlement.dashboard().then((r) => setData(r.data?.data));
  }, []);

  return (
    <PayrollLegacyPage title="Final settlement" description="Payroll workspace.">
      <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending settlements</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.pending_settlements ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">EOS liability</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.eos_liability ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Under separation</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.employees_under_separation ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total settlement</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.total_settlement_amount ?? "—"}</CardContent>
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
                  {ex.employee_id ? ` (employee ${ex.employee_id})` : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/people/payroll/separations">Separations</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/final-settlements">Final settlements</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/eos-configuration">EOS configuration</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/settlement-register">Settlement register</Link>
        </Button>
      </div>
          </div>
        </PayrollLegacyPage>
  );
}
