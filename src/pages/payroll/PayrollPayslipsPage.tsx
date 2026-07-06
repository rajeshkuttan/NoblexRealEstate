import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollPayslipsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [runId, setRunId] = useState("");

  const load = () => {
    const params = runId ? { run_id: runId } : undefined;
    payrollAPI.documentsHub.payslips.list(params).then((r) => setRows(r.data?.data || []));
  };

  useEffect(() => {
    load();
  }, []);

  const batchGenerate = async () => {
    if (!runId) return toast.error("Enter payroll run ID");
    await payrollAPI.documentsHub.payslips.batch({ payroll_run_id: Number(runId) });
    toast.success("Batch generation started");
    load();
  };

  const publish = async () => {
    if (!runId) return toast.error("Enter payroll run ID");
    await payrollAPI.documentsHub.payslips.publish({ payroll_run_id: Number(runId) });
    toast.success("Payslips published");
    load();
  };

  const download = async (id: number, name: string) => {
    const r = await payrollAPI.documentsHub.payslips.download(id);
    const url = window.URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.pdf`;
    a.click();
  };

  return (
    <PayrollLegacyPage titleKey="payroll.pages.payslips" descriptionKey="payroll.workspaceDescription">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Batch actions (LOCKED run required)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <div>
            <Label>Payroll run ID</Label>
            <Input value={runId} onChange={(e) => setRunId(e.target.value)} className="w-40" />
          </div>
          <Button onClick={batchGenerate}>Generate batch</Button>
          <Button variant="secondary" onClick={publish}>
            Publish
          </Button>
          <Button variant="outline" onClick={load}>
            Refresh
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Number</th>
                <th className="text-left">Employee</th>
                <th className="text-right">Net</th>
                <th className="text-left">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.payslipNumber}</td>
                  <td>{p.employeeId}</td>
                  <td className="text-right">{p.netSalary}</td>
                  <td>{p.status}</td>
                  <td>
                    {p.status !== "VOID" && (
                      <Button size="sm" variant="ghost" onClick={() => download(p.id, p.payslipNumber)}>
                        PDF
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
          </div>
        </PayrollLegacyPage>
  );
}
