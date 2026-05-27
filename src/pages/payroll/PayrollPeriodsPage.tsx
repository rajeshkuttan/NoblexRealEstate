import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollPeriodsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const now = new Date();

  const load = () => payrollAPI.processing.payrollPeriods.list().then((r) => setRows(r.data?.data ?? []));

  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    await payrollAPI.processing.payrollPeriods.generate({
      period_month: now.getMonth() + 1,
      period_year: now.getFullYear(),
    });
    toast.success("Payroll period generated");
    load();
  };

  const lock = async (id: number) => {
    await payrollAPI.processing.payrollPeriods.lock(id);
    toast.success("Period locked");
    load();
  };

  return (
    <PayrollLegacyPage title="Payroll periods" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.periodMonth}/{r.periodYear}
                  </TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    {r.status === "APPROVED" && (
                      <Button size="sm" onClick={() => lock(r.id)}>
                        Lock
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
