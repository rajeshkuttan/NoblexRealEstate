import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollWpsBatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [runId, setRunId] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const load = () => payrollAPI.wps.batches.list().then((r) => setBatches(r.data?.data ?? []));

  useEffect(() => {
    load();
    payrollAPI.processing.runs.list().then((r) => {
      const approved = (r.data?.data ?? []).filter((x: any) =>
        ["APPROVED", "LOCKED"].includes(x.status)
      );
      setRuns(approved);
    });
  }, []);

  const generate = async () => {
    if (!runId) {
      toast.error("Select an approved payroll run");
      return;
    }
    try {
      await payrollAPI.wps.generate({ payroll_run_id: Number(runId) });
      toast.success("WPS batch generated");
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Generation failed");
    }
  };

  const loadDetail = async (id: number) => {
    const r = await payrollAPI.wps.batches.getById(id);
    setSelected(r.data?.data);
  };

  const review = async (id: number) => {
    await payrollAPI.wps.batches.review(id);
    toast.success("Batch under review");
    loadDetail(id);
    load();
  };

  const approve = async (id: number) => {
    await payrollAPI.wps.batches.approve(id);
    toast.success("Batch approved");
    loadDetail(id);
    load();
  };

  const exportSif = async (id: number) => {
    const r = await payrollAPI.wps.batches.export(id);
    const payload = r.data?.data;
    const content = payload?.content;
    const fileName = payload?.file_name || `wps_${id}.txt`;
    if (content) {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success("SIF exported");
    loadDetail(id);
    load();
  };

  return (
    <PayrollLegacyPage title="WPS batches" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.id}</TableCell>
                  <TableCell>
                    {b.salaryMonth}/{b.salaryYear}
                  </TableCell>
                  <TableCell>{b.status}</TableCell>
                  <TableCell>{b.totalEmployees}</TableCell>
                  <TableCell>{b.totalAmount}</TableCell>
                  <TableCell className="space-x-1">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/people/payroll/wps/batches/${b.id}`}>Workspace</Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => loadDetail(b.id)}>
                      Quick view
                    </Button>
                    {b.status === "GENERATED" && (
                      <Button size="sm" onClick={() => review(b.id)}>
                        Review
                      </Button>
                    )}
                    {(b.status === "UNDER_REVIEW" || b.status === "GENERATED") && (
                      <Button size="sm" variant="outline" onClick={() => approve(b.id)}>
                        Approve
                      </Button>
                    )}
                    {b.status === "APPROVED" && (
                      <Button size="sm" onClick={() => exportSif(b.id)}>
                        Export SIF
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selected && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="font-medium">Batch #{selected.id} lines</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(selected.lines || []).map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.employeeName}</TableCell>
                    <TableCell>{l.iban}</TableCell>
                    <TableCell>{l.salaryAmount}</TableCell>
                    <TableCell>{l.validationStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
          </div>
        </PayrollLegacyPage>
  );
}
