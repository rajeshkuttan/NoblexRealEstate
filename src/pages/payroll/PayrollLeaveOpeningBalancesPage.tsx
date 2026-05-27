import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollLeaveOpeningBalancesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const year = new Date().getFullYear();

  const load = () => payrollAPI.leaveOpeningBalances.list({ balance_year: year }).then((r) => setRows(r.data?.data ?? []));

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: number) => {
    await payrollAPI.leaveOpeningBalances.approve(id);
    toast.success("Opening balance approved");
    load();
  };

  return (
    <PayrollLegacyPage title="Leave opening balances" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{year} balances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave type</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.employee?.employeeName}</TableCell>
                  <TableCell>{r.leaveType?.leaveName}</TableCell>
                  <TableCell>{r.openingDays}</TableCell>
                  <TableCell>{r.availableDays}</TableCell>
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
