import { useEffect, useState } from "react";
import { payrollAPI } from "@/services/api";
import {
  PayrollPageShell,
  PayrollKpiCard,
  PayrollKpiGrid,
  PayrollDataTable,
} from "@/components/payroll";
import { usePayrollPeriod } from "@/hooks/payroll/usePayrollPeriod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type ReportState = { title: string; rows: any[]; columns: { key: string; header: string; field: string }[] };

const REPORT_DEFS: {
  label: string;
  load: () => Promise<any>;
  columns: { key: string; header: string; field: string }[];
  mapRows?: (data: any) => any[];
}[] = [
  {
    label: "Payroll register",
    load: () => payrollAPI.processing.register({}),
    columns: [
      { key: "e", header: "Employee", field: "employee.employeeName" },
      { key: "g", header: "Gross", field: "gross" },
      { key: "n", header: "Net", field: "net" },
    ],
    mapRows: (d) => d.data ?? [],
  },
  {
    label: "Leave balance",
    load: () => payrollAPI.reports.leaveBalance({}),
    columns: [
      { key: "e", header: "Employee", field: "employee.employeeName" },
      { key: "t", header: "Leave type", field: "leaveType.leaveName" },
      { key: "b", header: "Balance", field: "closingBalance" },
    ],
    mapRows: (d) => d.data ?? [],
  },
  {
    label: "WPS register",
    load: () => payrollAPI.wps.reports.register(),
    columns: [
      { key: "e", header: "Employee", field: "employeeName" },
      { key: "n", header: "Net", field: "netSalary" },
    ],
    mapRows: (d) => d.data ?? [],
  },
  {
    label: "EOS liability",
    load: () => payrollAPI.settlement.reports.eosLiability(),
    columns: [
      { key: "e", header: "Employee", field: "employeeName" },
      { key: "l", header: "Liability", field: "eosLiability" },
    ],
    mapRows: (d) => d.data ?? [],
  },
  {
    label: "Document expiry",
    load: () => payrollAPI.documents.listExpiring({ days: 30 }),
    columns: [
      { key: "e", header: "Employee", field: "employee.employeeName" },
      { key: "t", header: "Type", field: "documentType" },
      { key: "x", header: "Expiry", field: "expiryDate" },
    ],
    mapRows: (d) => d.data ?? [],
  },
];

function getField(obj: any, path: string) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

export default function PayrollReportsCenterPage() {
  const { periodParams } = usePayrollPeriod();
  const [costData, setCostData] = useState<any>(null);
  const [activeReport, setActiveReport] = useState<ReportState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    payrollAPI.workspace
      .costAllocation(periodParams)
      .then((r) => setCostData(r.data?.data))
      .catch(() => setCostData(null));
  }, [periodParams]);

  const runReport = async (def: (typeof REPORT_DEFS)[0]) => {
    setLoading(true);
    try {
      const res = await def.load();
      const rows = def.mapRows ? def.mapRows(res.data) : [];
      setActiveReport({
        title: def.label,
        rows,
        columns: def.columns,
      });
    } catch {
      toast.error(`Failed to load ${def.label}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PayrollPageShell
      title="Reports center"
      description="Operational and real-estate cost reports with tabular output."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Reports" },
      ]}
    >
      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Report catalog</TabsTrigger>
          <TabsTrigger value="cost">Real estate cost</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {REPORT_DEFS.map((def) => (
              <Button key={def.label} variant="outline" size="sm" disabled={loading} onClick={() => runReport(def)}>
                {def.label}
              </Button>
            ))}
          </div>
          {activeReport && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{activeReport.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <PayrollDataTable
                  columns={activeReport.columns.map((c) => ({
                    key: c.key,
                    header: c.header,
                    cell: (r: any) => {
                      const v = getField(r, c.field);
                      return v ?? "—";
                    },
                  }))}
                  data={activeReport.rows}
                  getRowKey={(r: any) => String(r.id ?? r.employee?.id ?? r.employeeNo ?? r.payslipNumber ?? Math.random())}
                  emptyMessage="No rows."
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cost" className="mt-4 space-y-6">
          {!costData && (
            <p className="text-sm text-muted-foreground">
              Select a period with a calculated payroll run to view cost allocation.
            </p>
          )}
          {costData && (
            <>
              <PayrollKpiGrid className="lg:grid-cols-3">
                <PayrollKpiCard title="Run" value={`#${costData.run?.id}`} subtitle={costData.run?.status} />
              </PayrollKpiGrid>
              <section>
                <h3 className="font-semibold mb-2">By department</h3>
                <PayrollDataTable
                  columns={[
                    { key: "d", header: "Department", cell: (r: any) => r.department },
                    { key: "p", header: "Property", cell: (r: any) => r.property },
                    { key: "n", header: "Net pay", cell: (r: any) => r.net_pay },
                    { key: "c", header: "Headcount", cell: (r: any) => r.employee_count },
                  ]}
                  data={costData.by_department ?? []}
                  getRowKey={(r: any) => r.department}
                />
              </section>
              <section>
                <h3 className="font-semibold mb-2">By cost center</h3>
                <PayrollDataTable
                  columns={[
                    { key: "cc", header: "Cost center", cell: (r: any) => r.cost_center },
                    { key: "n", header: "Net pay", cell: (r: any) => r.net_pay },
                  ]}
                  data={costData.by_cost_center ?? []}
                  getRowKey={(r: any) => r.cost_center}
                />
              </section>
              <section>
                <h3 className="font-semibold mb-2">Maintenance labour (LABOUR)</h3>
                <PayrollDataTable
                  columns={[
                    { key: "wf", header: "Workforce", cell: (r: any) => r.workforce },
                    { key: "n", header: "Net pay", cell: (r: any) => r.net_pay },
                  ]}
                  data={(costData.by_workforce ?? []).filter((r: any) => r.workforce === "LABOUR")}
                  getRowKey={(r: any) => r.workforce}
                  emptyMessage="No labour workforce in this run."
                />
              </section>
            </>
          )}
        </TabsContent>
      </Tabs>
    </PayrollPageShell>
  );
}
