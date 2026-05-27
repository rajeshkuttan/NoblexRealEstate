import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

export default function PayrollVariancePage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.processing.payrollPeriods.list().then((pRes) => {
      const periods = pRes.data?.data ?? [];
      if (periods.length < 2) return;
      payrollAPI.processing
        .variance({
          current_period_id: periods[0].id,
          previous_period_id: periods[1].id,
        })
        .then((r) => setRows(r.data?.data ?? []));
    });
  }, []);

  return (
    <PayrollLegacyPage title="Payroll variance" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Current net</TableHead>
                <TableHead>Previous net</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.employee?.employeeName}</TableCell>
                  <TableCell>{r.current_net}</TableCell>
                  <TableCell>{r.previous_net}</TableCell>
                  <TableCell>{r.variance}</TableCell>
                  <TableCell>{r.reason}</TableCell>
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
