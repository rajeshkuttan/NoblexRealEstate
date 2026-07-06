import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function PayrollLoansPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.processing.loans.list().then((r) => setRows(r.data?.data ?? []));
  }, []);

  return (
    <PayrollLegacyPage titleKey="payroll.pages.loans" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Installment</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.employee?.employeeName}</TableCell>
                  <TableCell>{r.loanAmount}</TableCell>
                  <TableCell>{r.monthlyInstallment}</TableCell>
                  <TableCell>{r.balance}</TableCell>
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
