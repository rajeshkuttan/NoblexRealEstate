import { useEffect, useState } from "react";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayrollPageShell, PayrollStatusBadge, PayrollDataTable } from "@/components/payroll";

export default function PayrollSalaryStructuresPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    payrollAPI.salaryStructure.list({ limit: 200 }).then((r) => setRows(r.data?.data ?? []));
  }, []);

  const totalFor = (r: any) =>
    (r.lines ?? []).reduce((s: number, l: any) => s + Number(l.amount || 0), 0);

  const earnings = (selected?.lines ?? []).filter(
    (l: any) => l.component?.componentType === "EARNING" || !l.component
  );
  const deductions = (selected?.lines ?? []).filter((l: any) => l.component?.componentType === "DEDUCTION");

  return (
    <PayrollPageShell
      title="Salary structures"
      description="Active structures with component lines, totals, and EOS/WPS flags from components."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Salary structures" },
      ]}
      showPeriod={false}
    >
      <PayrollDataTable
        columns={[
          {
            key: "emp",
            header: "Employee",
            cell: (r: any) => `${r.employee?.employeeNo ?? ""} ${r.employee?.employeeName ?? ""}`,
          },
          { key: "eff", header: "Effective from", cell: (r: any) => String(r.effectiveFrom).slice(0, 10) },
          { key: "comp", header: "Lines", cell: (r: any) => r.lines?.length ?? 0 },
          { key: "tot", header: "Monthly total", cell: (r: any) => `${totalFor(r).toLocaleString()} AED` },
          { key: "st", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
          {
            key: "view",
            header: "",
            cell: (r: any) => (
              <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                Components
              </Button>
            ),
          },
        ]}
        data={rows}
        getRowKey={(r: any) => r.id}
      />

      {selected && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="text-base">
              {selected.employee?.employeeName} — effective {String(selected.effectiveFrom).slice(0, 10)}
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground mb-2">Earnings</p>
              <PayrollDataTable
                columns={[
                  { key: "c", header: "Component", cell: (l: any) => l.component?.componentName ?? l.lineDescription },
                  { key: "a", header: "Amount", cell: (l: any) => l.amount },
                  {
                    key: "w",
                    header: "WPS",
                    cell: (l: any) => (l.component?.affectsWps ? "Yes" : "—"),
                  },
                ]}
                data={earnings}
                getRowKey={(l: any) => l.id}
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground mb-2">Deductions</p>
              <PayrollDataTable
                columns={[
                  { key: "c", header: "Component", cell: (l: any) => l.component?.componentName ?? l.lineDescription },
                  { key: "a", header: "Amount", cell: (l: any) => l.amount },
                ]}
                data={deductions}
                getRowKey={(l: any) => l.id}
                emptyMessage="No deduction lines."
              />
            </div>
            <p className="md:col-span-2 text-sm font-semibold">
              Gross total: AED {totalFor(selected).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </PayrollPageShell>
  );
}
