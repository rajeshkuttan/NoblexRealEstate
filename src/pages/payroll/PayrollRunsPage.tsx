import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollRunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);

  const load = () => payrollAPI.processing.runs.list().then((r) => setRuns(r.data?.data ?? []));

  useEffect(() => {
    load();
    payrollAPI.processing.payrollPeriods.list().then((r) => setPeriods(r.data?.data ?? []));
  }, []);

  const createRun = async () => {
    const period = periods[0];
    if (!period) {
      toast.error("Generate a payroll period first");
      return;
    }
    await payrollAPI.processing.runs.create({ payroll_period_id: period.id, run_type: "REGULAR" });
    toast.success("Run created");
    load();
  };

  const calculate = async (id: number) => {
    await payrollAPI.processing.runs.calculate(id);
    toast.success("Payroll calculated");
    load();
  };

  const approve = async (id: number) => {
    await payrollAPI.processing.runs.approve(id);
    toast.success("Run approved");
    load();
  };

  const lock = async (id: number) => {
    await payrollAPI.processing.runs.lock(id);
    toast.success("Run locked");
    load();
  };

  return (
    <PayrollLegacyPage title="Payroll runs" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Net</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.runNumber}</TableCell>
                  <TableCell>{r.runType}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.totalNet}</TableCell>
                  <TableCell className="space-x-2">
                    {r.status === "DRAFT" && (
                      <Button size="sm" onClick={() => calculate(r.id)}>
                        Calculate
                      </Button>
                    )}
                    {r.status === "CALCULATED" && (
                      <Button size="sm" variant="outline" onClick={() => approve(r.id)}>
                        Approve
                      </Button>
                    )}
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
