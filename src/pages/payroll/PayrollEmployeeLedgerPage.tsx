import { useState } from "react";
import { Link } from "react-router-dom";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PayrollPageShell } from "@/components/payroll";

export default function PayrollEmployeeLedgerPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [ledger, setLedger] = useState<any>(null);

  const load = async () => {
    if (!employeeId) return;
    const r = await payrollAPI.finance.employeeLedger({ employee_id: Number(employeeId) });
    setLedger(r.data?.data);
  };

  return (
    <PayrollPageShell
      title="Employee ledger"
      description="Running balance and transaction history per employee."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Finance", href: "/people/payroll/finance" },
        { label: "Employee ledger" },
      ]}
      showPeriod={false}
    >
      <Card>
        <CardHeader>
          <CardTitle>Lookup</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 items-end max-w-md">
          <div className="flex-1">
            <Label>Employee ID</Label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          </div>
          <Button onClick={load}>Load</Button>
        </CardContent>
      </Card>
      {ledger?.lines?.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Date</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.lines.map((l: any) => (
                  <tr key={l.id}>
                    <td>{l.transactionDate}</td>
                    <td className="text-right">{l.debit}</td>
                    <td className="text-right">{l.credit}</td>
                    <td className="text-right">{l.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </PayrollPageShell>
  );
}
