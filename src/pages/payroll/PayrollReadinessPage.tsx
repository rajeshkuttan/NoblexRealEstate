import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function PayrollReadinessPage() {
  const now = new Date();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    payrollAPI.attendance
      .payrollReadiness({ month: now.getMonth() + 1, year: now.getFullYear() })
      .then((r) => setData(r.data?.data));
  }, []);

  return (
    <PayrollLegacyPage title="Payroll readiness" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>P3 handoff snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <p>Total employees: {data?.total_employees}</p>
          <p>Missing attendance: {data?.missing_attendance}</p>
          <p>Pending leave: {data?.pending_leave_approvals}</p>
          <p>Pending OT: {data?.pending_overtime_approvals}</p>
          <p>Unapproved timesheets: {data?.unapproved_timesheets}</p>
          <p>Period locked: {data?.locked_status ? "Yes" : "No"}</p>
          <p className="md:col-span-2">Period: {data?.period?.status}</p>
          {data?.blocking_issues?.map((b: string, i: number) => (
            <p key={i} className="md:col-span-2 text-amber-700">
              • {b}
            </p>
          ))}
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
};
