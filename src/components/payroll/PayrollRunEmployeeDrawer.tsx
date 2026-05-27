import { useEffect, useState } from "react";
import { payrollAPI } from "@/services/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CalculationBreakdownPanel, type BreakdownLine } from "./CalculationBreakdownPanel";
import { PayrollStatusBadge } from "./PayrollStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: number;
  employeeId: number | null;
  employeeName?: string;
};

export function PayrollRunEmployeeDrawer({ open, onOpenChange, runId, employeeId, employeeName }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !employeeId || !runId) return;
    setLoading(true);
    payrollAPI.workspace
      .runEmployeeLine(runId, employeeId)
      .then((r) => setData(r.data?.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, runId, employeeId]);

  const earnings: BreakdownLine[] = (data?.earnings ?? []).map((l: any) => ({
    label: l.component?.componentName ?? l.calculationMethod ?? "Earning",
    amount: Number(l.calculatedAmount),
    type: "earning",
  }));
  const deductions: BreakdownLine[] = (data?.deductions ?? []).map((l: any) => ({
    label: l.component?.componentName ?? l.calculationMethod ?? "Deduction",
    amount: Number(l.calculatedAmount),
    type: "deduction",
  }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{employeeName ?? data?.line?.employee?.employeeName ?? "Employee line"}</SheetTitle>
          <SheetDescription>
            Run #{runId} · <PayrollStatusBadge status={data?.line?.status} />
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {loading && <Skeleton className="h-32 w-full" />}
          {!loading && data && (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Payable days</span>
                  <p className="font-medium">{data.line?.payableDays ?? "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Working days</span>
                  <p className="font-medium">{data.line?.workingDays ?? "—"}</p>
                </div>
              </div>
              <CalculationBreakdownPanel
                earnings={earnings}
                deductions={deductions}
                net={Number(data.line?.netSalary)}
              />
              {data.attendance_snapshot && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Attendance snapshot</summary>
                  <pre className="mt-2 bg-muted p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(data.attendance_snapshot, null, 2)}
                  </pre>
                </details>
              )}
              {data.salary_structure_snapshot && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Salary snapshot</summary>
                  <pre className="mt-2 bg-muted p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(data.salary_structure_snapshot, null, 2)}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
