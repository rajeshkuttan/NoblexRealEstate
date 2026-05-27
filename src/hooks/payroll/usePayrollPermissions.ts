import { useMemo } from "react";
import { useCan } from "@/hooks/useCan";

export function usePayrollPermissions() {
  const can = useCan();

  return useMemo(
    () => ({
      organization: {
        view: can("payroll.organization.view"),
        manage: can("payroll.organization.manage"),
      },
      employee: {
        view: can("payroll.employee.view"),
        manage: can("payroll.employee.manage"),
      },
      salary: {
        view: can("payroll.salary.view"),
        manage: can("payroll.salary.manage"),
      },
      document: {
        view: can("payroll.document.view"),
        manage: can("payroll.document.manage"),
      },
      policy: {
        view: can("payroll.policy.view"),
        manage: can("payroll.policy.manage"),
      },
      attendance: {
        view: can("payroll.attendance.view"),
        manage: can("payroll.attendance.manage"),
      },
      leave: {
        view: can("payroll.leave.operations.view"),
        manage: can("payroll.leave.operations.manage"),
      },
      processing: {
        view: can("payroll.processing.view"),
        manage: can("payroll.processing.manage"),
        approve: can("payroll.processing.approve"),
      },
      wps: {
        view: can("payroll.wps.view"),
        manage: can("payroll.wps.manage"),
        approve: can("payroll.wps.approve"),
      },
      settlement: {
        view: can("payroll.settlement.view"),
        manage: can("payroll.settlement.manage"),
        approve: can("payroll.settlement.approve"),
      },
      finance: {
        view: can("payroll.finance.view"),
        manage: can("payroll.finance.manage"),
        approve: can("payroll.finance.approve"),
      },
      documentsHub: {
        view: can("payroll.documents.view"),
        manage: can("payroll.documents.manage"),
        publish: can("payroll.documents.publish"),
      },
    }),
    [can]
  );
}
