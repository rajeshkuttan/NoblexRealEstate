import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { payrollAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { PayrollPageShell, PayrollStatusBadge, PayrollDataTable } from "@/components/payroll";
import { usePayrollPermissions } from "@/hooks/payroll/usePayrollPermissions";

export default function PayrollLeaveApplicationsPage() {
  const { t } = useTranslation();
  const perms = usePayrollPermissions();
  const [params] = useSearchParams();
  const statusFilter = params.get("status") || undefined;
  const [rows, setRows] = useState<any[]>([]);

  const load = () =>
    payrollAPI.leaveApplications
      .list(statusFilter ? { status: statusFilter } : {})
      .then((r) => setRows(r.data?.data ?? []));

  useEffect(() => {
    load();
  }, [statusFilter]);

  const approve = async (id: number) => {
    await payrollAPI.leaveApplications.approve(id);
    toast.success("Leave approved");
    load();
  };

  const reject = async (id: number) => {
    await payrollAPI.leaveApplications.reject(id, { reason: "Rejected from payroll workspace" });
    toast.success("Leave rejected");
    load();
  };

  const cancel = async (id: number) => {
    await payrollAPI.leaveApplications.cancel(id);
    toast.success("Leave cancelled");
    load();
  };

  const submit = async (id: number) => {
    await payrollAPI.leaveApplications.submit(id);
    toast.success("Leave submitted");
    load();
  };

  return (
    <PayrollPageShell
      title={t("payroll.pages.leaveApplications")}
      description={statusFilter ? `Filtered: ${statusFilter}` : "Submit, approve, reject, and cancel leave."}
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Leave dashboard", href: "/people/payroll/leave-dashboard" },
        { label: "Applications" },
      ]}
      showPeriod={false}
      actions={
        <Button size="sm" variant="outline" asChild>
          <Link to="/people/payroll/leave-dashboard">Leave dashboard</Link>
        </Button>
      }
    >
      <PayrollDataTable
        columns={[
          { key: "e", header: "Employee", cell: (r: any) => r.employee?.employeeName },
          { key: "t", header: "Type", cell: (r: any) => r.leaveType?.leaveName ?? "—" },
          { key: "f", header: "From", cell: (r: any) => r.fromDate },
          { key: "to", header: "To", cell: (r: any) => r.toDate },
          { key: "d", header: "Days", cell: (r: any) => r.totalDays },
          { key: "s", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
          {
            key: "a",
            header: "Actions",
            cell: (r: any) => (
              <div className="flex gap-1 flex-wrap">
                {r.status === "DRAFT" && perms.leave.manage && (
                  <Button size="sm" variant="outline" onClick={() => submit(r.id)}>
                    Submit
                  </Button>
                )}
                {r.status === "SUBMITTED" && perms.leave.manage && (
                  <>
                    <Button size="sm" onClick={() => approve(r.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reject(r.id)}>
                      Reject
                    </Button>
                  </>
                )}
                {["DRAFT", "SUBMITTED", "APPROVED"].includes(r.status) && perms.leave.manage && (
                  <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>
                    Cancel
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        data={rows}
        getRowKey={(r: any) => r.id}
      />
      <Card className="mt-4 border-amber-500/30">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Approve leave only after confirming attendance period is not locked for the leave dates. Lock attendance
          before running payroll for the period.
        </CardContent>
      </Card>
    </PayrollPageShell>
  );
}
