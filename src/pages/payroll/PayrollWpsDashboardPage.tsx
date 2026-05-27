import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function PayrollWpsDashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    payrollAPI.wps.dashboard().then((r) => setData(r.data?.data));
  }, []);

  const em = data?.emiratisation;

  return (
    <PayrollLegacyPage title="WPS dashboard" description="Payroll workspace.">
      <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending batches</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.pending_batches ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Line errors</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.error_line_count ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Emiratisation</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {em ? `${em.actual_percent}%` : "—"}
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/people/payroll/wps/batches">WPS batches</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/wps/compliance">Compliance check</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/wps/configuration">WPS configuration</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/emiratisation">Emiratisation</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/people/payroll/gpssa">GPSSA</Link>
        </Button>
      </div>
          </div>
        </PayrollLegacyPage>
  );
}
