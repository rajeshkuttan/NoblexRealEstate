const MODULES = [
  "dashboard",
  "properties",
  "units",
  "tenants",
  "leads",
  "leases",
  "helpdesk",
  "reports",
  "marketing",
  "finance",
  "vendors",
  "treasury",
  "investment",
  "chart_of_accounts",
  "journal_vouchers",
  "ledger_setups",
  "budget",
  "procurement",
  "legal",
  "settings",
  "users",
  "roles_permissions",
  "document_numbering",
  "company_settings",
  "company_finance_config",
  "system_health",
  "system_settings",
];

const ACTIONS = ["view", "create", "update", "delete"];

const PERMISSION_DEFINITIONS = MODULES.flatMap((moduleKey) =>
  ACTIONS.map((action) => ({
    module: moduleKey,
    page: moduleKey,
    action,
    code: `module:${moduleKey}:${action}`,
    description: `${action.toUpperCase()} access for ${moduleKey.replace(/_/g, " ")}`,
  })),
);

const DIRECT_PURCHASE_INVOICE_EXTRA_PERMISSIONS = [
  {
    module: "finance",
    page: "direct_purchase_invoice",
    action: "view",
    code: "module:finance:direct_purchase_invoice:view",
    description: "View direct purchase invoices",
  },
  {
    module: "finance",
    page: "direct_purchase_invoice",
    action: "create",
    code: "module:finance:direct_purchase_invoice:create",
    description: "Create direct purchase invoices",
  },
  {
    module: "finance",
    page: "direct_purchase_invoice",
    action: "update",
    code: "module:finance:direct_purchase_invoice:update",
    description: "Update direct purchase invoices",
  },
  {
    module: "finance",
    page: "direct_purchase_invoice",
    action: "post",
    code: "module:finance:direct_purchase_invoice:post",
    description: "Post direct purchase invoices",
  },
  {
    module: "finance",
    page: "direct_purchase_invoice",
    action: "cancel",
    code: "module:finance:direct_purchase_invoice:cancel",
    description: "Cancel direct purchase invoices",
  },
  {
    module: "finance",
    page: "direct_purchase_invoice",
    action: "delete",
    code: "module:finance:direct_purchase_invoice:delete",
    description: "Delete draft direct purchase invoices",
  },
];

const PAYROLL_EXTRA_PERMISSIONS = [
  { module: 'payroll', page: 'organization', action: 'view', code: 'payroll.organization.view', description: 'View payroll organization masters' },
  { module: 'payroll', page: 'organization', action: 'manage', code: 'payroll.organization.manage', description: 'Manage payroll organization masters' },
  { module: 'payroll', page: 'employee', action: 'view', code: 'payroll.employee.view', description: 'View employees' },
  { module: 'payroll', page: 'employee', action: 'manage', code: 'payroll.employee.manage', description: 'Manage employees' },
  { module: 'payroll', page: 'salary', action: 'view', code: 'payroll.salary.view', description: 'View salary structures' },
  { module: 'payroll', page: 'salary', action: 'manage', code: 'payroll.salary.manage', description: 'Manage salary structures' },
  { module: 'payroll', page: 'document', action: 'view', code: 'payroll.document.view', description: 'View employee documents' },
  { module: 'payroll', page: 'document', action: 'manage', code: 'payroll.document.manage', description: 'Manage employee documents' },
  { module: 'payroll', page: 'policy', action: 'view', code: 'payroll.policy.view', description: 'View leave/shift/components policies' },
  { module: 'payroll', page: 'policy', action: 'manage', code: 'payroll.policy.manage', description: 'Manage leave/shift/components policies' },
  { module: 'payroll', page: 'attendance', action: 'view', code: 'payroll.attendance.view', description: 'View attendance, timesheets, periods' },
  { module: 'payroll', page: 'attendance', action: 'manage', code: 'payroll.attendance.manage', description: 'Manage attendance, timesheets, periods' },
  { module: 'payroll', page: 'leave_operations', action: 'view', code: 'payroll.leave.operations.view', description: 'View leave applications and balances' },
  { module: 'payroll', page: 'leave_operations', action: 'manage', code: 'payroll.leave.operations.manage', description: 'Manage leave applications and balances' },
  { module: 'payroll', page: 'processing', action: 'view', code: 'payroll.processing.view', description: 'View payroll runs, register, variance' },
  { module: 'payroll', page: 'processing', action: 'manage', code: 'payroll.processing.manage', description: 'Manage payroll runs, adjustments, loans' },
  { module: 'payroll', page: 'processing', action: 'approve', code: 'payroll.processing.approve', description: 'Approve and lock payroll runs' },
  { module: 'payroll', page: 'wps', action: 'view', code: 'payroll.wps.view', description: 'View WPS compliance, batches, reports' },
  { module: 'payroll', page: 'wps', action: 'manage', code: 'payroll.wps.manage', description: 'Manage WPS config, generate batches, employee WPS bank' },
  { module: 'payroll', page: 'wps', action: 'approve', code: 'payroll.wps.approve', description: 'Approve and export WPS batches' },
  { module: 'payroll', page: 'settlement', action: 'view', code: 'payroll.settlement.view', description: 'View final settlements, separations, EOS reports' },
  { module: 'payroll', page: 'settlement', action: 'manage', code: 'payroll.settlement.manage', description: 'Manage separations, EOS config, calculate settlements' },
  { module: 'payroll', page: 'settlement', action: 'approve', code: 'payroll.settlement.approve', description: 'Approve and lock final settlements' },
  { module: 'payroll', page: 'finance', action: 'view', code: 'payroll.finance.view', description: 'View payroll finance dashboard, ledger, reconciliation' },
  { module: 'payroll', page: 'finance', action: 'manage', code: 'payroll.finance.manage', description: 'Configure payroll GL accounts and post payroll to finance' },
  { module: 'payroll', page: 'finance', action: 'approve', code: 'payroll.finance.approve', description: 'Reverse payroll finance postings' },
  { module: 'payroll', page: 'documents', action: 'view', code: 'payroll.documents.view', description: 'View payslips, certificates, exports, documents hub' },
  { module: 'payroll', page: 'documents', action: 'manage', code: 'payroll.documents.manage', description: 'Generate payslips, certificates, settlement docs, exports' },
  { module: 'payroll', page: 'documents', action: 'publish', code: 'payroll.documents.publish', description: 'Publish payslips and void published payslips' },
];

const INVESTMENT_EXTRA_PERMISSIONS = [
  { module: 'investment', page: 'investment', action: 'approve', code: 'module:investment:approve', description: 'Approve investment transactions and valuations' },
  { module: 'investment', page: 'investment', action: 'post', code: 'module:investment:post', description: 'Post investment transactions to finance' },
  { module: 'investment', page: 'investment', action: 'reports', code: 'module:investment:reports', description: 'View investment reports' },
  { module: 'investment', page: 'investment', action: 'valuation', code: 'module:investment:valuation', description: 'Create investment valuations' },
  { module: 'investment', page: 'investment', action: 'partner_statement', code: 'module:investment:partner_statement', description: 'View partner investment statements' },
];

const SYSTEM_HEALTH_EXTRA_PERMISSIONS = [
  {
    module: "system_health",
    page: "system_health",
    action: "run",
    code: "module:system_health:run",
    description: "Run system integrity scans",
  },
];

const COMPANY_SETTINGS_EXTRA_PERMISSIONS = [
  {
    module: "company_settings",
    page: "company_settings",
    action: "assign_users",
    code: "module:company_settings:assign_users",
    description: "Assign users to companies",
  },
  {
    module: "company_settings",
    page: "company_settings",
    action: "audit",
    code: "module:company_settings:audit",
    description: "View company settings audit logs",
  },
];

const ALL_PERMISSION_DEFINITIONS = [
  ...PERMISSION_DEFINITIONS,
  ...COMPANY_SETTINGS_EXTRA_PERMISSIONS,
  ...DIRECT_PURCHASE_INVOICE_EXTRA_PERMISSIONS,
  ...PAYROLL_EXTRA_PERMISSIONS,
  ...INVESTMENT_EXTRA_PERMISSIONS,
  ...SYSTEM_HEALTH_EXTRA_PERMISSIONS,
];

const PAYROLL_PERMISSION_CODES = PAYROLL_EXTRA_PERMISSIONS.map((p) => p.code);
const INVESTMENT_PERMISSION_CODES = [
  ...PERMISSION_DEFINITIONS.filter((p) => p.module === 'investment').map((p) => p.code),
  ...INVESTMENT_EXTRA_PERMISSIONS.map((p) => p.code),
];

const ADMIN_PERMISSIONS = ALL_PERMISSION_DEFINITIONS.map((item) => item.code);

const SYSTEM_ROLE_PERMISSIONS = {
  admin: ADMIN_PERMISSIONS,
  manager: [
    ...ADMIN_PERMISSIONS.filter((code) => !code.startsWith("module:roles_permissions:")),
  ],
  finance_manager: [
    ...PERMISSION_DEFINITIONS.filter((item) =>
      ["finance", "vendors", "treasury", "investment", "chart_of_accounts", "journal_vouchers", "ledger_setups", "budget", "reports", "dashboard", "company_finance_config"].includes(item.module),
    ).map((item) => item.code),
    ...DIRECT_PURCHASE_INVOICE_EXTRA_PERMISSIONS.map((item) => item.code),
    ...PAYROLL_PERMISSION_CODES,
    ...INVESTMENT_PERMISSION_CODES,
    "module:system_health:view",
  ],
  finance_executive: [
    ...PERMISSION_DEFINITIONS.filter((item) =>
      ["finance", "vendors", "treasury", "investment", "reports", "dashboard"].includes(item.module) &&
      ["view", "create", "update"].includes(item.action),
    ).map((item) => item.code),
    'module:investment:reports',
  ],
  operations_executive: PERMISSION_DEFINITIONS.filter((item) =>
    ["properties", "units", "tenants", "leases", "helpdesk", "dashboard", "reports", "procurement", "legal"].includes(item.module),
  ).map((item) => item.code),
  maintenance_contractor: PERMISSION_DEFINITIONS.filter((item) =>
    ["helpdesk", "dashboard"].includes(item.module) &&
    ["view", "update"].includes(item.action),
  ).map((item) => item.code),
  agent: PERMISSION_DEFINITIONS.filter((item) =>
    ["properties", "units", "leads", "leases", "dashboard", "reports"].includes(item.module) &&
    ["view", "create", "update"].includes(item.action),
  ).map((item) => item.code),
  tenant: PERMISSION_DEFINITIONS.filter((item) =>
    ["dashboard", "leases", "helpdesk", "reports"].includes(item.module) && item.action === "view",
  ).map((item) => item.code),
  viewer: [
    ...PERMISSION_DEFINITIONS.filter((item) => item.action === "view").map((item) => item.code),
    'module:investment:reports',
  ],
};

module.exports = {
  MODULES,
  ACTIONS,
  PERMISSION_DEFINITIONS: ALL_PERMISSION_DEFINITIONS,
  COMPANY_SETTINGS_EXTRA_PERMISSIONS,
  PAYROLL_EXTRA_PERMISSIONS,
  INVESTMENT_EXTRA_PERMISSIONS,
  INVESTMENT_PERMISSION_CODES,
  PAYROLL_PERMISSION_CODES,
  SYSTEM_ROLE_PERMISSIONS,
};
