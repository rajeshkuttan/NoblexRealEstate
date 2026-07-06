import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function PayrollMonthlySummaryPage() {
  const now = new Date();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.attendance
      .monthlySummary({ month: now.getMonth() + 1, year: now.getFullYear() })
      .then((r) => setRows(r.data?.data ?? []));
  }, []);

  return (
    <PayrollLegacyPage titleKey="payroll.pages.monthlySummary" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Present</TableHead>
                <TableHead>Paid leave</TableHead>
                <TableHead>Unpaid</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>Payable days</TableHead>
                <TableHead>OT hrs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.employee?.employeeName}</TableCell>
                  <TableCell>{r.present_days}</TableCell>
                  <TableCell>{r.paid_leave_days}</TableCell>
                  <TableCell>{r.unpaid_leave_days}</TableCell>
                  <TableCell>{r.absent_days}</TableCell>
                  <TableCell className="font-medium">{r.payable_days}</TableCell>
                  <TableCell>{r.overtime_hours}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
};
