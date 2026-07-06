import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { payrollAPI } from "@/services/api";
import {
  PayrollPageShell,
  PayrollFilterPanel,
  PayrollDataTable,
  PayrollStatusBadge,
  DocumentRiskChip,
  type FilterField,
} from "@/components/payroll";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PayrollEmployeesPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [workforceGroupId, setWorkforceGroupId] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [wpsReady, setWpsReady] = useState("");
  const [docRisk, setDocRisk] = useState("");
  const [depts, setDepts] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [workforces, setWorkforces] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    payrollAPI.organization.list("departments", { limit: 200 }).then((r) => setDepts(r.data?.data ?? []));
    payrollAPI.organization.list("designations", { limit: 200 }).then((r) => setDesignations(r.data?.data ?? []));
    payrollAPI.organization.list("workforce-groups", { limit: 50 }).then((r) => setWorkforces(r.data?.data ?? []));
    payrollAPI.organization.list("visa-sponsor-companies", { limit: 50 }).then((r) => setSponsors(r.data?.data ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.employees.list({
        limit: 200,
        search: search || undefined,
        status: status || undefined,
        department_id: departmentId || undefined,
        designation_id: designationId || undefined,
        workforce_group_id: workforceGroupId || undefined,
        visa_sponsor_id: sponsorId || undefined,
        wps_ready: wpsReady || undefined,
        document_risk: docRisk || undefined,
      });
      setRows(res.data?.data ?? []);
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [search, status, departmentId, designationId, workforceGroupId, sponsorId, wpsReady, docRisk]);

  useEffect(() => {
    load();
  }, [load]);

  const filterFields: FilterField[] = [
    { key: "search", label: "Search", type: "search", value: search, onChange: setSearch, placeholder: "Name or employee no…" },
    {
      key: "status",
      label: "Status",
      type: "select",
      value: status,
      onChange: setStatus,
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "terminated", label: "Terminated" },
      ],
    },
    {
      key: "dept",
      label: "Department",
      type: "select",
      value: departmentId,
      onChange: setDepartmentId,
      options: depts.map((d) => ({ value: String(d.id), label: d.departmentName })),
    },
    {
      key: "des",
      label: "Designation",
      type: "select",
      value: designationId,
      onChange: setDesignationId,
      options: designations.map((d) => ({ value: String(d.id), label: d.designationName })),
    },
    {
      key: "wf",
      label: "Workforce",
      type: "select",
      value: workforceGroupId,
      onChange: setWorkforceGroupId,
      options: workforces.map((w) => ({ value: String(w.id), label: w.groupName ?? w.groupCode })),
    },
    {
      key: "sponsor",
      label: "Sponsor",
      type: "select",
      value: sponsorId,
      onChange: setSponsorId,
      options: sponsors.map((s) => ({ value: String(s.id), label: s.sponsorName })),
    },
    {
      key: "wps",
      label: "WPS",
      type: "select",
      value: wpsReady,
      onChange: setWpsReady,
      options: [
        { value: "true", label: "WPS ready" },
        { value: "false", label: "WPS not ready" },
      ],
    },
    {
      key: "doc",
      label: "Documents",
      type: "select",
      value: docRisk,
      onChange: setDocRisk,
      options: [
        { value: "expiring", label: "Expiring soon" },
        { value: "expired", label: "Expired" },
      ],
    },
  ];

  return (
    <PayrollPageShell
      title={t("payroll.pages.employees")}
      description="Workforce master with filters, WPS readiness, document risk, and Employee 360."
      breadcrumbs={[
        { label: "Payroll", href: "/people/payroll" },
        { label: "Employees" },
      ]}
      showPeriod={false}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link to="/people/payroll/employees/new">
              <Plus className="h-4 w-4 mr-2" />
              New employee
            </Link>
          </Button>
        </>
      }
    >
      <PayrollFilterPanel fields={filterFields} />
      <PayrollDataTable
        loading={loading}
        data={rows}
        getRowKey={(r) => r.id}
        columns={[
          { key: "no", header: "No.", cell: (r) => <span className="font-mono text-sm">{r.employeeNo}</span> },
          { key: "name", header: "Name", cell: (r) => r.employeeName },
          { key: "dept", header: "Department", cell: (r) => r.department?.departmentName ?? "—" },
          { key: "des", header: "Designation", cell: (r) => r.designation?.designationName ?? "—" },
          {
            key: "wf",
            header: "Workforce",
            cell: (r) => r.workforceGroup?.groupCode ?? r.workforceGroup?.groupName ?? "—",
          },
          { key: "pg", header: "Payroll group", cell: (r) => r.payrollGroup?.groupCode ?? "—" },
          {
            key: "wps",
            header: "WPS",
            cell: (r) => (
              <Badge variant={r.wps_ready ? "default" : "secondary"}>{r.wps_ready ? "Ready" : "Issue"}</Badge>
            ),
          },
          {
            key: "risk",
            header: "Docs",
            cell: (r) => (
              <DocumentRiskChip expiringCount={r.document_risk?.expiring} expiredCount={r.document_risk?.expired} />
            ),
          },
          {
            key: "sal",
            header: "Salary",
            cell: (r) =>
              r.current_salary_total != null ? `AED ${Number(r.current_salary_total).toLocaleString()}` : "—",
          },
          { key: "status", header: "Status", cell: (r) => <PayrollStatusBadge status={r.status} /> },
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (r) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/people/payroll/employees/${r.id}`}>View 360</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/people/payroll/employees/${r.id}/edit`}>Edit</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/people/payroll/salary-structures">Salary</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/people/payroll/employee-ledger?employee_id=${r.id}`}>Ledger</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />
    </PayrollPageShell>
  );
}
