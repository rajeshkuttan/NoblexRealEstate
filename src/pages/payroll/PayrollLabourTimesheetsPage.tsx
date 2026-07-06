import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollLabourTimesheetsPage() {
  const now = new Date();
  const [rows, setRows] = useState<any[]>([]);

  const load = () =>
    payrollAPI.labourTimesheets
      .list({ timesheet_month: now.getMonth() + 1, timesheet_year: now.getFullYear() })
      .then((r) => setRows(r.data?.data ?? []));

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: number) => {
    await payrollAPI.labourTimesheets.approve(id);
    toast.success("Timesheet approved");
    load();
  };

  return (
    <PayrollLegacyPage titleKey="payroll.pages.labourTimesheets" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.timesheetMonth}/{r.timesheetYear}
                  </TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.lines?.length ?? 0}</TableCell>
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
