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

const PREPAID_EXPENSE_EXTRA_PERMISSIONS = [
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'view', code: 'module:prepaid_expenses:view', description: 'View prepaid expenses' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'create', code: 'module:prepaid_expenses:create', description: 'Create prepaid expenses' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'update', code: 'module:prepaid_expenses:update', description: 'Update prepaid expenses' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'delete', code: 'module:prepaid_expenses:delete', description: 'Delete draft prepaid expenses' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'generate_schedule', code: 'module:prepaid_expenses:generate_schedule', description: 'Generate prepaid recognition schedules' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'submit', code: 'module:prepaid_expenses:submit', description: 'Submit prepaid expenses for approval' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'approve', code: 'module:prepaid_expenses:approve', description: 'Approve prepaid expenses' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'post', code: 'module:prepaid_expenses:post', description: 'Post prepaid recognition entries' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'reverse', code: 'module:prepaid_expenses:reverse', description: 'Reverse posted prepaid recognition' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'amend', code: 'module:prepaid_expenses:amend', description: 'Create and approve prepaid amendments' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'reconcile', code: 'module:prepaid_expenses:reconcile', description: 'Reconcile prepaid subledger to GL' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'settings', code: 'module:prepaid_expenses:settings', description: 'Manage prepaid expense settings' },
  { module: 'prepaid_expenses', page: 'prepaid_expenses', action: 'admin', code: 'module:prepaid_expenses:admin', description: 'Administer prepaid expense module' },
];

const LEASE_REVENUE_EXTRA_PERMISSIONS = [
  { module: 'lease_revenue', page: 'lease_revenue', action: 'view', code: 'module:lease_revenue:view', description: 'View lease revenue schedules' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'create', code: 'module:lease_revenue:create', description: 'Create lease revenue schedules' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'update', code: 'module:lease_revenue:update', description: 'Update lease revenue schedules' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'delete', code: 'module:lease_revenue:delete', description: 'Delete draft lease revenue schedules' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'generate_schedule', code: 'module:lease_revenue:generate_schedule', description: 'Generate lease revenue recognition schedules' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'submit', code: 'module:lease_revenue:submit', description: 'Submit lease revenue for approval' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'approve', code: 'module:lease_revenue:approve', description: 'Approve lease revenue schedules' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'post', code: 'module:lease_revenue:post', description: 'Post lease revenue recognition entries' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'reverse', code: 'module:lease_revenue:reverse', description: 'Reverse posted lease revenue recognition' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'amend', code: 'module:lease_revenue:amend', description: 'Create and approve lease revenue amendments' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'terminate', code: 'module:lease_revenue:terminate', description: 'Terminate lease revenue schedules' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'reconcile', code: 'module:lease_revenue:reconcile', description: 'Reconcile lease revenue subledger to GL' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'settings', code: 'module:lease_revenue:settings', description: 'Manage lease revenue settings' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'admin', code: 'module:lease_revenue:admin', description: 'Administer lease revenue module' },
  { module: 'lease_revenue', page: 'lease_revenue', action: 'auto_post', code: 'module:lease_revenue:auto_post', description: 'Auto-post lease revenue via scheduler' },
];

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
  { module: 'investment', page: 'investment', action: 'legacy_emergency_entry', code: 'module:investment:legacy_emergency_entry', description: 'Break-glass legacy investment entry after OMS cutover' },
];

const COPILOT_EXTRA_PERMISSIONS = [
  { module: 'copilot', page: 'copilot', action: 'use', code: 'module:copilot:use', description: 'Use the AI Copilot workspace' },
  { module: 'copilot', page: 'copilot', action: 'documents', code: 'module:copilot:documents', description: 'Manage Copilot document corpus' },
  { module: 'copilot', page: 'copilot', action: 'admin', code: 'module:copilot:admin', description: 'Administer Copilot providers and policies' },
  { module: 'copilot', page: 'copilot', action: 'evaluate', code: 'module:copilot:evaluate', description: 'Run Copilot evaluation suites' },
  { module: 'copilot', page: 'copilot', action: 'export', code: 'module:copilot:export', description: 'Export Copilot answers and tool data (PDF/Excel)' },
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

const PREPAID_EXPENSE_PERMISSION_CODES = PREPAID_EXPENSE_EXTRA_PERMISSIONS.map((p) => p.code);
const LEASE_REVENUE_PERMISSION_CODES = LEASE_REVENUE_EXTRA_PERMISSIONS.map((p) => p.code);

const ALL_PERMISSION_DEFINITIONS = [
  ...PERMISSION_DEFINITIONS,
  ...COMPANY_SETTINGS_EXTRA_PERMISSIONS,
  ...PREPAID_EXPENSE_EXTRA_PERMISSIONS,
  ...LEASE_REVENUE_EXTRA_PERMISSIONS,
  ...DIRECT_PURCHASE_INVOICE_EXTRA_PERMISSIONS,
  ...PAYROLL_EXTRA_PERMISSIONS,
  ...INVESTMENT_EXTRA_PERMISSIONS,
  ...COPILOT_EXTRA_PERMISSIONS,
  ...SYSTEM_HEALTH_EXTRA_PERMISSIONS,
];

const PAYROLL_PERMISSION_CODES = PAYROLL_EXTRA_PERMISSIONS.map((p) => p.code);
const INVESTMENT_PERMISSION_CODES = [
  ...PERMISSION_DEFINITIONS.filter((p) => p.module === 'investment').map((p) => p.code),
  ...INVESTMENT_EXTRA_PERMISSIONS.map((p) => p.code),
];
const COPILOT_PERMISSION_CODES = COPILOT_EXTRA_PERMISSIONS.map((p) => p.code);

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
    ...PREPAID_EXPENSE_PERMISSION_CODES,
    ...LEASE_REVENUE_PERMISSION_CODES,
    ...PAYROLL_PERMISSION_CODES,
    ...INVESTMENT_PERMISSION_CODES,
    "module:system_health:view",
    "module:copilot:use",
    "module:copilot:export",
  ],
  finance_executive: [
    ...PERMISSION_DEFINITIONS.filter((item) =>
      ["finance", "vendors", "treasury", "investment", "reports", "dashboard"].includes(item.module) &&
      ["view", "create", "update"].includes(item.action),
    ).map((item) => item.code),
    'module:investment:reports',
    'module:copilot:use',
  ],
  operations_executive: [
    ...PERMISSION_DEFINITIONS.filter((item) =>
      ["properties", "units", "tenants", "leases", "helpdesk", "dashboard", "reports", "procurement", "legal"].includes(item.module),
    ).map((item) => item.code),
    'module:copilot:use',
    'module:copilot:export',
  ],
  maintenance_contractor: PERMISSION_DEFINITIONS.filter((item) =>
    ["helpdesk", "dashboard"].includes(item.module) &&
    ["view", "update"].includes(item.action),
  ).map((item) => item.code),
  agent: [
    ...PERMISSION_DEFINITIONS.filter((item) =>
      ["properties", "units", "leads", "leases", "dashboard", "reports"].includes(item.module) &&
      ["view", "create", "update"].includes(item.action),
    ).map((item) => item.code),
    'module:copilot:use',
  ],
  tenant: PERMISSION_DEFINITIONS.filter((item) =>
    ["dashboard", "leases", "helpdesk", "reports"].includes(item.module) && item.action === "view",
  ).map((item) => item.code),
  viewer: [
    ...PERMISSION_DEFINITIONS.filter((item) => item.action === "view").map((item) => item.code),
    'module:investment:reports',
    'module:copilot:use',
  ],
};

module.exports = {
  MODULES,
  ACTIONS,
  PERMISSION_DEFINITIONS: ALL_PERMISSION_DEFINITIONS,
  COMPANY_SETTINGS_EXTRA_PERMISSIONS,
  PREPAID_EXPENSE_EXTRA_PERMISSIONS,
  PREPAID_EXPENSE_PERMISSION_CODES,
  LEASE_REVENUE_EXTRA_PERMISSIONS,
  LEASE_REVENUE_PERMISSION_CODES,
  PAYROLL_EXTRA_PERMISSIONS,
  INVESTMENT_EXTRA_PERMISSIONS,
  INVESTMENT_PERMISSION_CODES,
  PAYROLL_PERMISSION_CODES,
  COPILOT_EXTRA_PERMISSIONS,
  COPILOT_PERMISSION_CODES,
  SYSTEM_ROLE_PERMISSIONS,
};
