export const ACTION_VIEW = "view";

export const PAGE_PERMISSIONS: Record<string, string> = {
  "/": "module:dashboard:view",
  "/properties": "module:properties:view",
  "/units": "module:units:view",
  "/leads": "module:leads:view",
  "/tenants": "module:tenants:view",
  "/leases": "module:leases:view",
  "/legal": "module:legal:view",
  "/finance": "module:finance:view",
  "/finance/supplier-open-invoices": "module:finance:view",
  "/finance/direct-purchase-invoices": "module:finance:direct_purchase_invoice:view",
  "/finance/direct-purchase-invoices/new": "module:finance:direct_purchase_invoice:view",
  "/people/payroll": "payroll.organization.view",
  "/people/payroll/organization": "payroll.organization.view",
  "/people/payroll/employees": "payroll.employee.view",
  "/people/payroll/employees/new": "payroll.employee.manage",
  "/people/payroll/salary-structures": "payroll.salary.view",
  "/people/payroll/components": "payroll.policy.view",
  "/people/payroll/leave-policies": "payroll.policy.view",
  "/people/payroll/shifts": "payroll.policy.view",
  "/people/payroll/documents": "payroll.document.view",
  "/finance/tenant-open-invoices": "module:finance:view",
  "/finance/vat-return": "module:finance:view",
  "/finance/pdc": "module:finance:view",
  "/utilities/activity-log": "module:settings:view",
  "/communications/building-announcements": "module:leases:view",
  "/receivables": "module:finance:view",
  "/vendors": "module:vendors:view",
  "/treasury": "module:treasury:view",
  "/chart-of-accounts": "module:chart_of_accounts:view",
  "/journal-vouchers": "module:journal_vouchers:view",
  "/ledger-setups": "module:ledger_setups:view",
  "/budget": "module:budget:view",
  "/procurement": "module:procurement:view",
  "/helpdesk": "module:helpdesk:view",
  "/reports": "module:reports:view",
  "/settings": "module:settings:view",
  "/settings/company-settings": "module:company_settings:view",
  "/settings/company-finance-config": "module:company_finance_config:view",
  "/settings/system-health": "module:system_health:view",
  "/profile": "module:dashboard:view",
  "/investments/dashboard": "module:investment:view",
  "/investments/portfolio": "module:investment:view",
  "/investments/assets/new": "module:investment:create",
  "/investments/assets/:id/edit": "module:investment:update",
  "/investments/transactions": "module:investment:view",
  "/investments/dividends": "module:investment:view",
  "/investments/distributions": "module:investment:view",
  "/investments/valuations": "module:investment:valuation",
  "/investments/partner-allocations": "module:investment:view",
  "/investments/reports": "module:investment:reports",
  "/investments/categories": "module:investment:view",
  "/investments/settings": "module:investment:view",
};

export const COMPANY_SETTINGS_ASSIGN_USERS = "module:company_settings:assign_users";
export const COMPANY_SETTINGS_AUDIT = "module:company_settings:audit";

export const NAV_PERMISSION_BY_HREF: Record<string, string> = {
  "/": "module:dashboard:view",
  "/properties": "module:properties:view",
  "/units": "module:units:view",
  "/leads": "module:leads:view",
  "/tenants": "module:tenants:view",
  "/leases": "module:leases:view",
  "/legal": "module:legal:view",
  "/finance": "module:finance:view",
  "/finance/supplier-open-invoices": "module:finance:view",
  "/finance/direct-purchase-invoices": "module:finance:direct_purchase_invoice:view",
  "/finance/direct-purchase-invoices/new": "module:finance:direct_purchase_invoice:view",
  "/people/payroll": "payroll.organization.view",
  "/people/payroll/organization": "payroll.organization.view",
  "/people/payroll/employees": "payroll.employee.view",
  "/people/payroll/employees/new": "payroll.employee.manage",
  "/people/payroll/salary-structures": "payroll.salary.view",
  "/people/payroll/components": "payroll.policy.view",
  "/people/payroll/leave-policies": "payroll.policy.view",
  "/people/payroll/shifts": "payroll.policy.view",
  "/people/payroll/documents": "payroll.document.view",
  "/finance/tenant-open-invoices": "module:finance:view",
  "/finance/vat-return": "module:finance:view",
  "/finance/pdc": "module:finance:view",
  "/utilities/activity-log": "module:settings:view",
  "/communications/building-announcements": "module:leases:view",
  "/receivables": "module:finance:view",
  "/vendors": "module:vendors:view",
  "/treasury": "module:treasury:view",
  "/chart-of-accounts": "module:chart_of_accounts:view",
  "/journal-vouchers": "module:journal_vouchers:view",
  "/budget": "module:budget:view",
  "/ledger-setups": "module:ledger_setups:view",
  "/procurement": "module:procurement:view",
  "/helpdesk": "module:helpdesk:view",
  "/reports": "module:reports:view",
  "/settings": "module:settings:view",
  "/settings/company-settings": "module:company_settings:view",
  "/settings/company-finance-config": "module:company_finance_config:view",
  "/settings/system-health": "module:system_health:view",
  "/profile": "module:dashboard:view",
  "/investments/dashboard": "module:investment:view",
  "/investments/portfolio": "module:investment:view",
  "/investments/transactions": "module:investment:view",
  "/investments/dividends": "module:investment:view",
  "/investments/distributions": "module:investment:view",
  "/investments/valuations": "module:investment:valuation",
  "/investments/partner-allocations": "module:investment:view",
  "/investments/reports": "module:investment:reports",
  "/investments/categories": "module:investment:view",
  "/investments/settings": "module:investment:view",
};

/** Matches backend `normalizeLegacyRole` / DB `roles.key` (snake_case, lowercase). */
export function normalizeRoleKeyForMatch(role: unknown): string {
  if (typeof role !== "string" || !role.trim()) return "";
  return role
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");
}

/** Resolves API role id from number, numeric string, or ignores legacy placeholder 0. */
/** True when the user should see the Payroll nav item (any payroll module access). */
export function canAccessPayrollNav(
  can: (code: string) => boolean,
  permissions?: string[] | null,
): boolean {
  if (can("payroll.organization.view")) return true;
  const perms = Array.isArray(permissions) ? permissions : [];
  if (perms.includes("*")) return true;
  return perms.some((p) => typeof p === "string" && p.startsWith("payroll."));
}

export function parseStableRoleId(roleId: unknown): number | undefined {
  if (roleId === null || roleId === undefined) return undefined;
  const n = typeof roleId === "string" ? parseInt(roleId, 10) : Number(roleId);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}
