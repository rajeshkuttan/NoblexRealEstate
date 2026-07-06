import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollSeparationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    employee_id: "",
    separation_type: "RESIGNATION",
    last_working_day: "",
    notice_days: "30",
    served_notice_days: "0",
    reason: "",
  });

  const load = () => payrollAPI.settlement.separations.list().then((r) => setRows(r.data?.data ?? []));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    await payrollAPI.settlement.separations.create({
      employee_id: Number(form.employee_id),
      separation_type: form.separation_type,
      last_working_day: form.last_working_day,
      notice_days: Number(form.notice_days),
      served_notice_days: Number(form.served_notice_days),
      reason: form.reason,
    });
    toast.success("Separation created");
    load();
  };

  const approve = async (id: number) => {
    await payrollAPI.settlement.separations.approve(id);
    toast.success("Separation approved");
    load();
  };

  return (
    <PayrollLegacyPage titleKey="payroll.pages.separations" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 grid gap-3 max-w-md">
          <div>
            <Label>Employee ID</Label>
            <Input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
          </div>
          <div>
            <Label>Last working day</Label>
            <Input
              type="date"
              value={form.last_working_day}
              onChange={(e) => setForm({ ...form, last_working_day: e.target.value })}
            />
          </div>
          <Button onClick={create}>Create separation</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>LWD</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.employee?.employeeName || r.employeeId}</TableCell>
                  <TableCell>{r.separationType}</TableCell>
                  <TableCell>{r.lastWorkingDay}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    {r.status !== "APPROVED" && (
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
}
