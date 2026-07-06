import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function PayrollSettlementRegisterPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.settlement.reports.register().then((r) => setRows(r.data?.data ?? []));
  }, []);

  return (
    <PayrollLegacyPage titleKey="payroll.pages.settlementRegister" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.settlementNumber}</TableCell>
                  <TableCell>{r.employee?.employeeName}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.grossSettlement}</TableCell>
                  <TableCell>{r.deductions}</TableCell>
                  <TableCell>{r.netSettlement}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
}
