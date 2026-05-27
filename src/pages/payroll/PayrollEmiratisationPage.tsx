import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function PayrollEmiratisationPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    payrollAPI.emiratisation.getMetrics({ required_percent: 2 }).then((r) => setData(r.data?.data));
  }, []);

  return (
    <PayrollLegacyPage title="Emiratisation" description="Payroll workspace.">
      <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total active</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.total ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">UAE nationals</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.uae_nationals ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Actual %</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.actual_percent ?? "—"}%</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Gap</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data?.gap ?? "—"}%</CardContent>
        </Card>
      </div>
          </div>
        </PayrollLegacyPage>
  );
}
