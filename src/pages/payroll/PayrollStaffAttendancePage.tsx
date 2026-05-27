import { useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollStaffAttendancePage() {
  const [fromDate, setFromDate] = useState("2026-06-01");
  const [toDate, setToDate] = useState("2026-06-30");
  const [result, setResult] = useState<number | null>(null);

  const generate = async () => {
    const r = await payrollAPI.attendance.generateStaff({ from_date: fromDate, to_date: toDate });
    const n = r.data?.data?.generated ?? 0;
    setResult(n);
    toast.success(`Generated ${n} daily summaries`);
  };

  return (
    <PayrollLegacyPage title="Staff auto timesheet" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate attendance from calendar & leave</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div>
            <Label>From date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <Label>To date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Button onClick={generate}>Generate staff attendance</Button>
          {result != null && <p className="text-sm text-muted-foreground">Last run: {result} rows</p>}
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
};
