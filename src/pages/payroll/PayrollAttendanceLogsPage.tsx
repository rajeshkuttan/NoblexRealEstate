import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function PayrollAttendanceLogsPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.attendance.listLogs({ limit: 100 }).then((r) => setRows(r.data?.data ?? []));
  }, []);

  return (
    <PayrollLegacyPage title="Attendance logs" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.employee?.employeeName}</TableCell>
                  <TableCell>{r.attendanceDate}</TableCell>
                  <TableCell>{r.checkInTime}</TableCell>
                  <TableCell>{r.checkOutTime}</TableCell>
                  <TableCell>{r.source}</TableCell>
                  <TableCell>{r.status}</TableCell>
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
