import { useEffect, useState } from "react";
import { PayrollLegacyPage } from "@/components/payroll";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function PayrollGpssaPage() {
  const [config, setConfig] = useState<any>(null);
  const [eligible, setEligible] = useState<any[]>([]);
  const [rates, setRates] = useState({ employee_rate: "0", employer_rate: "0", government_rate: "0" });

  useEffect(() => {
    payrollAPI.gpssa.getConfiguration().then((r) => {
      const c = r.data?.data;
      setConfig(c);
      if (c) {
        setRates({
          employee_rate: String(c.employeeRate ?? 0),
          employer_rate: String(c.employerRate ?? 0),
          government_rate: String(c.governmentRate ?? 0),
        });
      }
    });
    payrollAPI.wps.reports.gpssaEligibility().then((r) => setEligible(r.data?.data ?? []));
  }, []);

  const save = async () => {
    await payrollAPI.gpssa.updateConfiguration({
      employee_rate: Number(rates.employee_rate),
      employer_rate: Number(rates.employer_rate),
      government_rate: Number(rates.government_rate),
      active: true,
    });
    toast.success("GPSSA configuration saved");
  };

  return (
    <PayrollLegacyPage title="GPSSA" description="Payroll workspace.">
      <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4 max-w-md">
          <p className="text-sm text-muted-foreground">Rates only — no contribution calculations in P4.</p>
          <div>
            <Label>Employee rate</Label>
            <Input
              value={rates.employee_rate}
              onChange={(e) => setRates({ ...rates, employee_rate: e.target.value })}
            />
          </div>
          <div>
            <Label>Employer rate</Label>
            <Input
              value={rates.employer_rate}
              onChange={(e) => setRates({ ...rates, employer_rate: e.target.value })}
            />
          </div>
          <div>
            <Label>Government rate</Label>
            <Input
              value={rates.government_rate}
              onChange={(e) => setRates({ ...rates, government_rate: e.target.value })}
            />
          </div>
          <Button onClick={save}>Save rates</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="font-medium mb-2">Eligible employees ({eligible.length})</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligible.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.employeeNo}</TableCell>
                  <TableCell>{e.employeeName}</TableCell>
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
