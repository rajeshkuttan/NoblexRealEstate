import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollFinalSettlementsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [separationId, setSeparationId] = useState("");

  const load = () => payrollAPI.settlement.settlements.list().then((r) => setRows(r.data?.data ?? []));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!separationId) {
      toast.error("Enter separation ID");
      return;
    }
    await payrollAPI.settlement.settlements.create({ separation_id: Number(separationId) });
    toast.success("Settlement created");
    load();
  };

  const loadDetail = async (id: number) => {
    const r = await payrollAPI.settlement.settlements.getById(id);
    setSelected(r.data?.data);
  };

  const calculate = async (id: number) => {
    await payrollAPI.settlement.settlements.calculate(id);
    toast.success("Settlement calculated");
    loadDetail(id);
    load();
  };

  const approve = async (id: number) => {
    await payrollAPI.settlement.settlements.approve(id);
    toast.success("Settlement approved");
    loadDetail(id);
    load();
  };

  const lock = async (id: number) => {
    await payrollAPI.settlement.settlements.lock(id);
    toast.success("Settlement locked");
    loadDetail(id);
    load();
  };

  return (
    <PayrollLegacyPage title="Final settlements" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Net</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.settlementNumber}</TableCell>
                  <TableCell>{r.employee?.employeeName || r.employeeId}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.grossSettlement}</TableCell>
                  <TableCell>{r.netSettlement}</TableCell>
                  <TableCell className="space-x-1">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/people/payroll/final-settlements/${r.id}`}>Workspace</Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => loadDetail(r.id)}>
                      Quick view
                    </Button>
                    {["DRAFT", "CALCULATED"].includes(r.status) && (
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
      {selected && (
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium mb-2">Lines — settlement #{selected.id}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(selected.lines || []).map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.componentType}</TableCell>
                    <TableCell>{l.componentName}</TableCell>
                    <TableCell>{l.amount}</TableCell>
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
