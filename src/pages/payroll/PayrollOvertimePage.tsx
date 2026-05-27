import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link, useSearchParams } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollOvertimePage() {
  const [params] = useSearchParams();
  const statusFilter = params.get("status") || undefined;
  const [rows, setRows] = useState<any[]>([]);

  const load = () =>
    payrollAPI.overtime.list(statusFilter ? { status: statusFilter } : {}).then((r) => setRows(r.data?.data ?? []));

  useEffect(() => {
    load();
  }, [statusFilter]);

  const approve = async (id: number) => {
    await payrollAPI.overtime.approve(id);
    toast.success("Overtime approved");
    load();
  };

  return (
    <PayrollLegacyPage title="Overtime requests" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.employee?.employeeName}</TableCell>
                  <TableCell>{r.workDate}</TableCell>
                  <TableCell>{r.requestedHours}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    {r.status === "SUBMITTED" && (
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
