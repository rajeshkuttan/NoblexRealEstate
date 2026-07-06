import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { payrollAPI } from "@/services/api";
import {
  PayrollPageShell,
  PayrollStatusBadge,
  DocumentRiskChip,
  AuditTimelineDrawer,
  CalculationBreakdownPanel,
  PayrollDataTable,
} from "@/components/payroll";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePayrollPermissions } from "@/hooks/payroll/usePayrollPermissions";
import { toast } from "sonner";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}

export default function PayrollEmployee360Page() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const employeeId = Number(id);
  const perms = usePayrollPermissions();
  const [bundle, setBundle] = useState<any>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const load = () => {
    if (!employeeId) return;
    payrollAPI.workspace.employee360(employeeId).then((r) => setBundle(r.data?.data));
  };

  useEffect(load, [employeeId]);

  const emp = bundle?.employee;
  const bank = bundle?.bank;

  const genCert = async () => {
    try {
      await payrollAPI.documentsHub.certificates.generate({ employee_id: employeeId });
      toast.success("Salary certificate generated");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to generate certificate");
    }
  };

  return (
    <PayrollPageShell
      title={emp?.employeeName ?? t("payroll.pages.employee360")}
      description={emp ? `${emp.employeeNo} · ${emp?.workforceGroup?.groupName ?? emp?.workforceGroup?.groupCode ?? "—"}` : "Loading…"}
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Employees", href: "/people/payroll/employees" },
        { label: emp?.employeeName ?? id ?? "" },
      ]}
      showPeriod={false}
      actions={
        <>
          <DocumentRiskChip
            expiringCount={bundle?.document_risk?.expiring}
            expiredCount={bundle?.document_risk?.expired}
          />
          <PayrollStatusBadge status={emp?.status?.toUpperCase?.() ?? emp?.status} />
          {perms.employee.manage && (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/people/payroll/employees/${id}/edit`}>Edit</Link>
            </Button>
          )}
          {perms.documentsHub.manage && (
            <Button size="sm" variant="outline" onClick={genCert}>
              Salary certificate
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setAuditOpen(true)}>
            Audit
          </Button>
        </>
      }
    >
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="attendance">Attendance & leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll history</TabsTrigger>
          <TabsTrigger value="loans">Loans & adjustments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="wps">WPS & bank</TabsTrigger>
          <TabsTrigger value="settlement">EOS / settlement</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Employee no." value={emp?.employeeNo} />
            <Field label="Status" value={emp?.status} />
            <Field label="Department" value={emp?.department?.departmentName} />
            <Field label="Designation" value={emp?.designation?.designationName} />
            <Field label="Workforce" value={emp?.workforceGroup?.groupName ?? emp?.workforceGroup?.groupCode} />
            <Field label="Payroll group" value={emp?.payrollGroup?.groupName} />
            <Field label="Branch" value={emp?.branch?.branchName} />
            <Field label="Cost center" value={emp?.department?.costCenter?.costCenterName} />
            <Field label="Sponsor" value={emp?.visaSponsor?.sponsorName} />
            <Field label="Joining date" value={emp?.joiningDate} />
            <Field label="Contract" value={emp?.contractType} />
            <Field
              label="Current salary"
              value={
                bundle?.current_salary_total != null
                  ? `AED ${Number(bundle.current_salary_total).toLocaleString()}`
                  : "—"
              }
            />
            <Field
              label="Last net pay"
              value={
                bundle?.last_run_line?.netSalary != null
                  ? `AED ${Number(bundle.last_run_line.netSalary).toLocaleString()}`
                  : "—"
              }
            />
            <Field label="WPS" value={bundle?.wps_ready ? "Ready" : "Not ready"} />
          </div>
        </TabsContent>

        <TabsContent value="employment" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6 grid gap-3 md:grid-cols-2">
              <Field label="Nationality" value={emp?.nationality} />
              <Field label="Gender" value={emp?.gender} />
              <Field label="UAE national" value={emp?.uaeNational ? "Yes" : "No"} />
              <Field label="GPSSA eligible" value={emp?.gpssaEligible ? "Yes" : "No"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employment history</CardTitle>
            </CardHeader>
            <CardContent>
              <PayrollDataTable
                columns={[
                  { key: "d", header: "Date", cell: (r: any) => r.eventDate },
                  { key: "t", header: "Type", cell: (r: any) => r.eventType },
                  { key: "n", header: "Notes", cell: (r: any) => r.notes ?? "—" },
                ]}
                data={bundle?.history ?? []}
                getRowKey={(r: any) => r.id}
                emptyMessage="No history events."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="mt-4 space-y-4">
          <Button size="sm" asChild>
            <Link to="/people/payroll/salary-structures">Open salary structures</Link>
          </Button>
          {bundle?.salary_structure?.lines?.length > 0 && (
            <PayrollDataTable
              columns={[
                { key: "c", header: "Component", cell: (r: any) => r.component?.componentName ?? r.lineDescription },
                { key: "a", header: "Amount", cell: (r: any) => r.amount },
              ]}
              data={bundle.salary_structure.lines}
              getRowKey={(r: any) => r.id}
            />
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "t", header: "Leave type", cell: (r: any) => r.leaveType?.leaveName ?? r.leaveTypeId },
              { key: "f", header: "From", cell: (r: any) => r.fromDate },
              { key: "to", header: "To", cell: (r: any) => r.toDate },
              { key: "s", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
            ]}
            data={bundle?.leave_applications ?? []}
            getRowKey={(r: any) => r.id}
            emptyMessage="No leave applications."
          />
          <Button className="mt-4" size="sm" variant="outline" asChild>
            <Link to="/people/payroll/leave-applications">All leave applications</Link>
          </Button>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4 space-y-4">
          <PayrollDataTable
            columns={[
              {
                key: "p",
                header: "Period",
                cell: (r: any) =>
                  r.payrollRun?.payrollPeriod
                    ? `${r.payrollRun.payrollPeriod.periodMonth}/${r.payrollRun.payrollPeriod.periodYear}`
                    : "—",
              },
              { key: "g", header: "Gross", cell: (r: any) => r.grossSalary },
              { key: "n", header: "Net", cell: (r: any) => r.netSalary },
              { key: "s", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
              {
                key: "a",
                header: "",
                cell: (r: any) =>
                  r.payrollRunId ? (
                    <Button size="sm" variant="link" asChild>
                      <Link to={`/people/payroll/runs/${r.payrollRunId}`}>Run</Link>
                    </Button>
                  ) : null,
              },
            ]}
            data={bundle?.payroll_history ?? []}
            getRowKey={(r: any) => r.id}
          />
        </TabsContent>

        <TabsContent value="loans" className="mt-4 space-y-6">
          <section>
            <h3 className="font-semibold mb-2">Loans</h3>
            <PayrollDataTable
              columns={[
                { key: "a", header: "Amount", cell: (r: any) => r.loanAmount },
                { key: "b", header: "Balance", cell: (r: any) => r.balance },
                { key: "s", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
              ]}
              data={bundle?.loans ?? []}
              getRowKey={(r: any) => r.id}
              emptyMessage="No active loans."
            />
          </section>
          <section>
            <h3 className="font-semibold mb-2">Adjustments</h3>
            <PayrollDataTable
              columns={[
                { key: "t", header: "Type", cell: (r: any) => r.adjustmentType },
                { key: "a", header: "Amount", cell: (r: any) => r.amount },
                { key: "s", header: "Status", cell: (r: any) => <PayrollStatusBadge status={r.status} /> },
              ]}
              data={bundle?.adjustments ?? []}
              getRowKey={(r: any) => r.id}
              emptyMessage="No adjustments."
            />
          </section>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Button size="sm" className="mb-4" asChild>
            <Link to="/people/payroll/documents">Upload / manage documents</Link>
          </Button>
          <PayrollDataTable
            columns={[
              { key: "type", header: "Type", cell: (r: any) => r.documentType },
              { key: "no", header: "Number", cell: (r: any) => r.documentNumber ?? "—" },
              { key: "expiry", header: "Expiry", cell: (r: any) => r.expiryDate ?? "—" },
            ]}
            data={bundle?.documents ?? []}
            getRowKey={(r: any) => r.id}
          />
        </TabsContent>

        <TabsContent value="wps" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid gap-2 md:grid-cols-2 text-sm">
              <Field label="IBAN" value={bank?.iban} />
              <Field label="Bank" value={bank?.bankName} />
              <Field label="MOL ID" value={bank?.molPersonalId} />
              <Field label="Labour card" value={bank?.labourCardNo} />
              <Field label="WPS enabled" value={bank?.wpsEnabled !== false ? "Yes" : "No"} />
              <Field label="Payment method" value={bank?.paymentMethod} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlement" className="mt-4">
          {bundle?.settlement ? (
            <>
              <CalculationBreakdownPanel
                net={Number(bundle.settlement.netSettlement)}
                snapshot={bundle.settlement.calculationSnapshot}
              />
              <Button className="mt-4" size="sm" asChild>
                <Link to={`/people/payroll/final-settlements/${bundle.settlement.id}`}>Open settlement workspace</Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active final settlement.</p>
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <PayrollDataTable
            columns={[
              { key: "d", header: "Date", cell: (r: any) => r.transactionDate },
              { key: "desc", header: "Description", cell: (r: any) => r.description },
              { key: "dr", header: "Debit", cell: (r: any) => r.debit },
              { key: "cr", header: "Credit", cell: (r: any) => r.credit },
              { key: "bal", header: "Balance", cell: (r: any) => r.balance },
            ]}
            data={bundle?.ledger?.lines ?? []}
            getRowKey={(r: any) => r.id}
            emptyMessage="No ledger lines yet."
          />
        </TabsContent>
      </Tabs>

      <AuditTimelineDrawer
        open={auditOpen}
        onOpenChange={setAuditOpen}
        entityType="employee"
        entityId={employeeId}
      />
    </PayrollPageShell>
  );
}
