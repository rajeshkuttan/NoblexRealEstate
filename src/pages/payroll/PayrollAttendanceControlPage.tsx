import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { payrollAPI } from "@/services/api";
import {
  PayrollPageShell,
  PayrollStatusBadge,
  ExceptionQueueTable,
  WorkflowActionBar,
} from "@/components/payroll";
import { usePayrollPeriod } from "@/hooks/payroll/usePayrollPeriod";
import { usePayrollPermissions } from "@/hooks/payroll/usePayrollPermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function PayrollAttendanceControlPage() {
  const { t } = useTranslation();
  const { month, year, periodParams } = usePayrollPeriod();
  const perms = usePayrollPermissions();
  const [readiness, setReadiness] = useState<any>(null);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [genDept, setGenDept] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      payrollAPI.attendance.payrollReadiness(periodParams),
      payrollAPI.workspace.attendanceExceptions(periodParams),
      payrollAPI.attendancePeriods.list(),
      payrollAPI.attendance.monthlySummary(periodParams),
    ])
      .then(([r, ex, p, sum]) => {
        setReadiness(r.data?.data ?? r.data);
        setExceptions(ex.data?.data?.exceptions ?? []);
        setPeriods(p.data?.data ?? []);
        setSummary(sum.data?.data ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [month, year]);

  const period = periods.find((p) => p.periodMonth === month && p.periodYear === year);

  const lockPeriod = async () => {
    if (!period?.id) {
      toast.error("Generate attendance period first");
      return;
    }
    await payrollAPI.attendancePeriods.lock(period.id);
    toast.success("Attendance period locked");
    load();
  };

  const generateStaff = async () => {
    await payrollAPI.attendance.generateStaff({
      month,
      year,
      ...(genDept ? { department_id: Number(genDept) } : {}),
    });
    toast.success("Staff attendance generated");
    load();
  };

  return (
    <PayrollPageShell
      title={t("payroll.pages.attendanceControl")}
      description="Exception-first P2 workspace — lock period before payroll calculation."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Attendance control" },
      ]}
    >
      <Card className={readiness?.ready_for_payroll ? "border-green-500/40" : "border-amber-500/40"}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Period {month}/{year}</CardTitle>
          <PayrollStatusBadge status={period?.status ?? readiness?.period?.status ?? "OPEN"} />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            {readiness?.ready_for_payroll
              ? "Ready for payroll calculation."
              : "Resolve exceptions before calculating payroll."}
          </p>
          {perms.attendance.manage && (
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label className="text-xs">Dept ID (optional)</Label>
                <Input className="w-28" value={genDept} onChange={(e) => setGenDept(e.target.value)} />
              </div>
              <Button size="sm" variant="outline" onClick={generateStaff}>
                Generate staff attendance
              </Button>
              <WorkflowActionBar
                actions={[
                  {
                    id: "lock",
                    label: "Lock attendance period",
                    onClick: lockPeriod,
                    disabled: !period || period.status === "LOCKED",
                    confirm: {
                      title: "Lock attendance period?",
                      description: "Locked periods cannot be edited without adjustment workflow.",
                    },
                  },
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="exceptions" className="mt-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="exceptions">Exceptions ({exceptions.length})</TabsTrigger>
          <TabsTrigger value="timesheets">Labour timesheets</TabsTrigger>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
          <TabsTrigger value="summary">Monthly summary</TabsTrigger>
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
        </TabsList>
        <TabsContent value="exceptions" className="mt-4">
          <ExceptionQueueTable items={exceptions} loading={loading} />
        </TabsContent>
        <TabsContent value="timesheets" className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/people/payroll/labour-timesheets">Open labour timesheet queue</Link>
          </Button>
        </TabsContent>
        <TabsContent value="overtime" className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link to="/people/payroll/overtime?status=SUBMITTED">Pending overtime approvals</Link>
          </Button>
        </TabsContent>
        <TabsContent value="summary" className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">{summary.length} employee summaries loaded.</p>
          <Button asChild variant="outline" size="sm">
            <Link to={`/people/payroll/monthly-summary?month=${month}&year=${year}`}>Full monthly summary</Link>
          </Button>
        </TabsContent>
        <TabsContent value="readiness" className="mt-4">
          <ul className="text-sm list-disc pl-5 space-y-1">
            {(readiness?.blocking_issues ?? []).map((b: string, i: number) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <Button className="mt-4" asChild size="sm" variant="outline">
            <Link to="/people/payroll/payroll-readiness">Readiness detail</Link>
          </Button>
        </TabsContent>
      </Tabs>
    </PayrollPageShell>
  );
}
