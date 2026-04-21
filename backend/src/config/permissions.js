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

const ADMIN_PERMISSIONS = PERMISSION_DEFINITIONS.map((item) => item.code);

const SYSTEM_ROLE_PERMISSIONS = {
  admin: ADMIN_PERMISSIONS,
  manager: ADMIN_PERMISSIONS.filter((code) => !code.startsWith("module:roles_permissions:")),
  finance_manager: PERMISSION_DEFINITIONS.filter((item) =>
    ["finance", "vendors", "treasury", "chart_of_accounts", "journal_vouchers", "ledger_setups", "budget", "reports", "dashboard"].includes(item.module),
  ).map((item) => item.code),
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
  PERMISSION_DEFINITIONS,
  SYSTEM_ROLE_PERMISSIONS,
};
