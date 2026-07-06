import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function PayrollRegisterPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.processing.runs.list().then((runsRes) => {
      const run = runsRes.data?.data?.[0];
      if (!run) return;
      payrollAPI.processing.register({ run_id: run.id }).then((r) => setRows(r.data?.data ?? []));
    });
  }, []);

  return (
    <PayrollLegacyPage titleKey="payroll.pages.register" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Basic</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>OT</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.employee?.employeeName}</TableCell>
                  <TableCell>{r.basic}</TableCell>
                  <TableCell>{r.allowances}</TableCell>
                  <TableCell>{r.overtime}</TableCell>
                  <TableCell>{r.gross}</TableCell>
                  <TableCell>{r.deductions}</TableCell>
                  <TableCell className="font-medium">{r.net}</TableCell>
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
