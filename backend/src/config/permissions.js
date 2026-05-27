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
  ...SYSTEM_HEALTH_EXTRA_PERMISSIONS,
];

const ADMIN_PERMISSIONS = ALL_PERMISSION_DEFINITIONS.map((item) => item.code);

const SYSTEM_ROLE_PERMISSIONS = {
  admin: ADMIN_PERMISSIONS,
  manager: ADMIN_PERMISSIONS.filter((code) => !code.startsWith("module:roles_permissions:")),
  finance_manager: [
    ...PERMISSION_DEFINITIONS.filter((item) =>
      ["finance", "vendors", "treasury", "chart_of_accounts", "journal_vouchers", "ledger_setups", "budget", "reports", "dashboard", "company_finance_config"].includes(item.module),
    ).map((item) => item.code),
    "module:system_health:view",
  ],
  finance_executive: PERMISSION_DEFINITIONS.filter((item) =>
    ["finance", "vendors", "treasury", "reports", "dashboard"].includes(item.module) &&
    ["view", "create", "update"].includes(item.action),
  ).map((item) => item.code),
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
  viewer: PERMISSION_DEFINITIONS.filter((item) => item.action === "view").map((item) => item.code),
};

module.exports = {
  MODULES,
  ACTIONS,
  PERMISSION_DEFINITIONS: ALL_PERMISSION_DEFINITIONS,
  COMPANY_SETTINGS_EXTRA_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
};
