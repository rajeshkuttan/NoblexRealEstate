import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollAdjustmentsPage() {
  const [rows, setRows] = useState<any[]>([]);

  const load = () => payrollAPI.processing.adjustments.list().then((r) => setRows(r.data?.data ?? []));

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: number) => {
    await payrollAPI.processing.adjustments.approve(id);
    toast.success("Adjustment approved");
    load();
  };

  return (
    <PayrollLegacyPage title="Payroll adjustments" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.employee?.employeeName}</TableCell>
                  <TableCell>{r.adjustmentType}</TableCell>
                  <TableCell>{r.amount}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    {r.status === "DRAFT" && (
                      <Button size="sm" onClick={() => approve(r.id)}>
                        Approve
                      </Button>
                    )}
                  </TableCell>
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
