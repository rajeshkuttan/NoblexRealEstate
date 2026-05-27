Phase 1.5 — Multi-Company Admin UI + Audit Hardening
Current Status

Phase 1 is already implemented.

Completed:

company_settings used as company master
company_users table implemented
company_id added to properties, units, tenants, leases
company context middleware implemented
company switcher implemented
API client sends x-company-id
portfolio modules scoped
finance/GL/PDC/treasury untouched
backend tests passed
frontend build OK
Objective

Build the missing admin and audit layer for multi-company usage.

This phase must make company management safe, visible, auditable, and production-ready.

Do not touch finance posting logic.

Main Goals

Implement:

1. Company Management UI
2. User-to-company assignment UI
3. Default company selector
4. Company access audit
5. Company switch audit logging
6. Cross-company leakage validation
7. Admin safeguards
Critical Rules

Cursor must follow these strictly:

Do not create companies table.
Use existing company_settings table.
Do not rename company_settings.
Do not add SaaS tenant logic.
Do not add organization_id or tenant_id.
Do not change finance/GL/PDC/treasury logic.
Do not change existing RBAC behavior.
Do not refactor unrelated modules.
Do not break existing single-company behavior.
Do not remove existing settings screen.
Task 0 — Inspect Existing Phase 1 Files First

Before coding, inspect:

backend/src/models/CompanyUser*
backend/src/models/CompanySettings*
backend/src/services/companyContextService.js
backend/src/middleware/resolveCompanyContext.js
backend/src/middleware/companyScope.js
backend/src/routes/companySettings*
backend/src/controllers/companySettings*

frontend/src/context/CompanyContext.tsx
frontend/src/utils/activeCompanyStorage.ts
frontend/src/layouts/AppLayout.tsx
frontend/src/services/companySettings*
frontend/src/pages/settings
frontend/src/routes
frontend/src/components

Prepare a short internal implementation note:

- Existing company API routes
- Existing settings page structure
- Existing user management APIs
- Existing audit log implementation
- Existing permission naming pattern

Do not invent new patterns if existing ones are available.

Task 1 — Backend: Confirm Required APIs

Ensure these APIs exist and work.

GET    /api/company-settings/my-companies
GET    /api/company-settings/current
GET    /api/company-settings
GET    /api/company-settings/:id
POST   /api/company-settings
PUT    /api/company-settings/:id
PATCH  /api/company-settings/:id/status
GET    /api/company-settings/:id/users
POST   /api/company-settings/:id/users
DELETE /api/company-settings/:id/users/:userId
PATCH  /api/company-settings/:id/users/:userId/default

If the default endpoint does not exist, add it.

Purpose:

Set selected company as default for a user.
Ensure only one default company per user.
Task 2 — Backend: User Assignment Rules

When assigning a user to company:

company_id must exist
company must be active
user_id must exist
duplicate assignment must not be created
inactive assignment may be reactivated

Payload example:

{
  "user_id": 12,
  "role_in_company": "Manager",
  "is_default": false
}

Rules:

If is_default = true, unset default from all other companies for that user.
Do not allow removing the user's last active company.
Do not allow deactivating the user's last active company assignment.
Do not allow setting default company if assignment is inactive.
Task 3 — Backend: Company Status Safeguards

For:

PATCH /api/company-settings/:id/status

Implement safeguards:

Cannot deactivate last active company in system.
Cannot deactivate company if it is the only active company for any active user.
Cannot deactivate company if current logged-in user's active company is the same company.

Return clear error:

{
  "message": "Cannot deactivate this company because it is the only active company for one or more users."
}
Task 4 — Backend: Audit Logging

Use existing audit log pattern if available.

Add audit events:

COMPANY_CREATED
COMPANY_UPDATED
COMPANY_ACTIVATED
COMPANY_DEACTIVATED
COMPANY_USER_ASSIGNED
COMPANY_USER_REMOVED
COMPANY_USER_DEFAULT_CHANGED
COMPANY_SWITCHED
COMPANY_ACCESS_DENIED
CROSS_COMPANY_ACCESS_BLOCKED

Each audit entry should include where possible:

actor_user_id
company_id
target_company_id
target_user_id
action
module = "company_settings"
ip_address
user_agent
metadata JSON
created_at

Do not create a duplicate audit table if one already exists.

If audit system exists, extend it.

If no reusable audit service exists, create a small audit helper consistent with the project.

Task 5 — Backend: Audit Company Switch

When frontend switches company, backend should receive/log the switch.

Add endpoint:

POST /api/company-settings/switch

Payload:

{
  "company_id": 2
}

Behavior:

Validate user has active access to company.
Validate company is active.
Log COMPANY_SWITCHED.
Return selected company.

Frontend should call this during switch.

Important:

The active company still comes from x-company-id header.
This endpoint is for validation + audit, not session storage.
Task 6 — Backend: Access Denied Audit

In resolveCompanyContext:

If user requests unauthorized company:

Log COMPANY_ACCESS_DENIED

If record is blocked due to company scope mismatch:

Log CROSS_COMPANY_ACCESS_BLOCKED

Do not log excessive duplicate records in tight loops.

At minimum log:

user_id
requested_company_id
route
method
reason
Task 7 — Backend: Cross-Company Validation Hardening

Review companyScope.js.

Ensure child-parent validation exists for:

unit → property
lease → property
lease → unit
lease → tenant

Also check bulk/import flows:

properties import
units import
tenants import
leases import

Rules:

Ignore body company_id.
Force req.companyId.
Reject parent records not belonging to req.companyId.
Do not allow imported rows to inject another company_id.
Task 8 — Backend: Admin Permissions

Reuse existing RBAC.

Add or use permissions such as:

company_settings.view
company_settings.create
company_settings.update
company_settings.delete
company_settings.assign_users
company_settings.audit

If project uses a different permission naming style, follow existing style.

Rules:

Normal users can call /my-companies and /current.
Only admins can create/update/deactivate companies.
Only admins can assign/remove users.
Only admins can view company audit logs.

Do not rewrite RBAC.

Task 9 — Backend: Company Audit API

Add endpoint:

GET /api/company-settings/:id/audit

Filters:

action
user_id
from_date
to_date
page
limit

Return:

{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}

Only include audit records for selected company/company_settings module.

Task 10 — Frontend: Company Admin Page

Create page:

/settings/company-settings

or use existing settings route pattern.

Page sections:

Company List
Company Profile Form
Company Users
Audit Log

Do not overdesign.

Task 11 — Frontend: Company List

Display columns:

Company Name
Arabic Name
Emirate
VAT Number
Currency
Active Status
User Count
Default for Me
Actions

Actions:

View/Edit
Activate/Deactivate
Manage Users
View Audit

Rules:

Do not allow deactivate button on currently active company without confirmation.
Show warning if company has users.
Task 12 — Frontend: Company Profile Form

Fields:

company_name
company_name_arabic
trade_license
commercial_register
tax_number
vat_number
address
city
emirate
postal_code
country
phone
email
website
logo
currency
timezone
language
fiscal_year_start
fiscal_year_end
business_hours
social_media
contract_terminology
emirate_authority_map
is_active

Rules:

Use existing validation style.
Do not remove existing company settings functionality.
Support create and edit.
Do not overwrite fields not included in form unless existing pattern does so.
Task 13 — Frontend: User Assignment UI

Inside company detail page, add users tab/section.

Features:

List assigned users
Add user to company
Remove user from company
Set default company for user
Show role_in_company
Show active/inactive assignment

Recommended UI:

Search/select user dropdown
Role in company input/select
Default checkbox
Assign button

Rules:

Do not allow removing yourself from current active company.
Do not allow removing last company from a user.
Confirm before removal.
Task 14 — Frontend: Default Company Handling

In company users section:

Set Default

Behavior:

Calls PATCH /api/company-settings/:id/users/:userId/default
Refreshes user assignment list
If current logged-in user changed own default, refresh CompanyContext
Task 15 — Frontend: Company Switch Audit

Modify switchCompany(companyId):

1. Call POST /api/company-settings/switch
2. If success:
   - update activeCompany
   - update localStorage
   - invalidate query cache
3. If failure:
   - show error
   - keep previous company

Do not rely only on localStorage switch.

Task 16 — Frontend: Audit Log View

Add audit tab in company detail page.

Display:

Date/Time
Action
Actor
Target User
IP Address
Details

Filters:

Action
Date From
Date To
User

Use pagination if existing table pattern supports it.

Task 17 — Frontend: Access Control

Use existing permission guard/hook.

Rules:

Hide company admin page if user lacks permission.
Hide assign user actions if user lacks company_settings.assign_users.
Hide audit tab if user lacks company_settings.audit.
Normal users should still see company switcher.
Task 18 — Frontend: UX Safeguards

Add confirmation dialogs for:

Deactivate company
Remove user from company
Set default company
Switch company if there are unsaved changes if existing app supports dirty form detection

At minimum:

Deactivate company confirmation
Remove user confirmation
Task 19 — Regression Guard

Ensure existing pages still work:

/properties
/units
/tenants
/leases
/finance
/finance/pdc
/receivables
/treasury
/reports

Company admin changes must not break them.

Task 20 — Tests

Add backend tests:

assign user to company
prevent duplicate assignment
set default company unsets old default
prevent removing last active company from user
prevent deactivating last active system company
company switch logs audit
unauthorized company access logs denial
cross-company access blocked

Add frontend tests if structure exists:

company switch calls /switch endpoint
company switch failure preserves previous company
company list renders
user assignment action calls correct API
audit tab renders with permissions
Task 21 — Verification Commands

Run:

cd backend
npm run build
npm test

If available:

npm run typecheck
npm run lint

Then:

cd frontend
npm run build
npm run lint

Fix only issues related to Phase 1.5.

Manual QA Checklist

Test this exactly:

1. Login as admin.
2. Open /settings/company-settings.
3. See existing default company.
4. Create second company.
5. Assign current user to second company.
6. Switch to second company from header.
7. Confirm portfolio data changes.
8. Switch back.
9. Set second company as default.
10. Logout/login.
11. Confirm default company loads.
12. Try to remove yourself from current active company.
13. System must block.
14. Try to deactivate only active company.
15. System must block.
16. Try unauthorized company ID in x-company-id.
17. System must reject and audit.
18. Open company audit log.
19. Confirm switch, assignment, update events are visible.
20. Open finance/PDC pages.
21. Confirm they still load and no posting logic changed.

---

## Live database scripts — Phase 1.5 admin + audit permissions

**Prerequisite:** Phase 1 migration [`20260527100000-phase1-multi-company-foundation.js`](../backend/src/migrations/20260527100000-phase1-multi-company-foundation.js) must already be applied (`company_users`, portfolio `company_id` columns).

**Migration file (source of truth):** `backend/src/migrations/20260528100000-phase15-company-settings-extra-permissions.js`

**Database:** MySQL (InnoDB)

**What this changes:**

| Step | Action |
|------|--------|
| 1 | Inserts `module:company_settings:assign_users` into `permissions` (if missing) |
| 2 | Inserts `module:company_settings:audit` into `permissions` (if missing) |
| 3 | Grants both permissions to the `admin` role via `role_permissions` |

**Does not change:** any table schema, `company_settings`, `company_users`, portfolio data, or finance/GL/PDC tables. Application code (admin UI, audit service, routes) must be deployed separately.

**After migrate:** users must **log out and log in** (or refresh permissions) so admins receive the new permission codes.

---

### Before you run on LIVE

1. **Full backup** of the production database.
2. Confirm Phase 1 is already applied (see pre-flight below).
3. **Deploy order:** run this migration (or manual SQL) **before or with** the Phase 1.5 backend/frontend deploy that uses `assign_users` and `audit` permissions.
4. **Record migration** in table `migrations` if you run SQL manually (see section B.3).

---

### Option A — Recommended: run via project migrator (LIVE connection)

Point `backend/config.env` at the **LIVE** database, then:

```bash
cd backend
npm run migrate
```

This runs all pending migrations in order and inserts `20260528100000-phase15-company-settings-extra-permissions.js` into `migrations` when executed.

**Check status:**

```sql
SELECT name, executed_at FROM migrations
WHERE name = '20260528100000-phase15-company-settings-extra-permissions.js';

SELECT code, description FROM permissions
WHERE code IN (
  'module:company_settings:assign_users',
  'module:company_settings:audit'
);
```

**Local/dev status (last run):** 79 migrations executed; no pending migrations (Phase 1.5 permissions migration already applied).

---

### Option B — Manual SQL for LIVE (MySQL)

Run in order. Idempotent: safe to re-run inserts that use `NOT EXISTS` checks.

#### B.0 — Pre-flight checks (read-only)

```sql
-- Phase 1.5 already applied?
SELECT name, executed_at FROM migrations
WHERE name = '20260528100000-phase15-company-settings-extra-permissions.js';

-- Phase 1 foundation present?
SELECT COUNT(*) AS company_users_table
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'company_users';

SELECT code FROM permissions
WHERE code IN (
  'module:company_settings:assign_users',
  'module:company_settings:audit'
);

SELECT r.`key`, p.code
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id
INNER JOIN permissions p ON p.id = rp.permission_id
WHERE r.`key` = 'admin'
  AND p.code IN (
    'module:company_settings:assign_users',
    'module:company_settings:audit'
  );
```

If the migration row exists **and** both permissions are linked to `admin`, **do not re-run** the forward script.

---

#### B.1 — Insert permissions

```sql
START TRANSACTION;

INSERT INTO permissions (module, page, action, code, description, is_active, created_at, updated_at)
SELECT 'company_settings', 'company_settings', 'assign_users',
       'module:company_settings:assign_users', 'Assign users to companies', 1, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE code = 'module:company_settings:assign_users'
);

INSERT INTO permissions (module, page, action, code, description, is_active, created_at, updated_at)
SELECT 'company_settings', 'company_settings', 'audit',
       'module:company_settings:audit', 'View company settings audit logs', 1, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM permissions WHERE code = 'module:company_settings:audit'
);

COMMIT;
```

---

#### B.2 — Grant permissions to admin role

```sql
START TRANSACTION;

SET @admin_role_id := (SELECT id FROM roles WHERE `key` = 'admin' LIMIT 1);

INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT @admin_role_id, p.id, NOW(), NOW()
FROM permissions p
WHERE p.code = 'module:company_settings:assign_users'
  AND @admin_role_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = @admin_role_id AND rp.permission_id = p.id
  );

INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT @admin_role_id, p.id, NOW(), NOW()
FROM permissions p
WHERE p.code = 'module:company_settings:audit'
  AND @admin_role_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = @admin_role_id AND rp.permission_id = p.id
  );

COMMIT;
```

**Note:** Other roles (e.g. `manager`) do not receive these permissions automatically. Grant via Roles & Permissions UI if needed.

---

#### B.3 — Register migration (required if you used manual SQL, not `npm run migrate`)

```sql
INSERT INTO migrations (name)
SELECT '20260528100000-phase15-company-settings-extra-permissions.js'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM migrations
  WHERE name = '20260528100000-phase15-company-settings-extra-permissions.js'
);
```

---

#### B.4 — Post-migration verification

```sql
SELECT name, executed_at FROM migrations
WHERE name = '20260528100000-phase15-company-settings-extra-permissions.js';

SELECT id, code, description FROM permissions
WHERE code IN (
  'module:company_settings:assign_users',
  'module:company_settings:audit'
);

SELECT r.`key`, p.code
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id
INNER JOIN permissions p ON p.id = rp.permission_id
WHERE r.`key` = 'admin'
  AND p.code LIKE 'module:company_settings:%'
ORDER BY p.code;
```

**Expected:** migration row present; two permission rows; both linked to `admin`.

---

### Rollback script (LIVE — use only if you must undo Phase 1.5 DB changes)

**Warning:** Removes only the two Phase 1.5 permission rows and admin role links. Does not remove Phase 1 schema. Take a backup first.

```sql
START TRANSACTION;

DELETE rp FROM role_permissions rp
INNER JOIN permissions p ON p.id = rp.permission_id
WHERE p.code IN (
  'module:company_settings:assign_users',
  'module:company_settings:audit'
);

DELETE FROM permissions
WHERE code IN (
  'module:company_settings:assign_users',
  'module:company_settings:audit'
);

DELETE FROM migrations
WHERE name = '20260528100000-phase15-company-settings-extra-permissions.js';

COMMIT;
```

---

### Implementation checklist (LIVE — Phase 1.5 DB)

| # | Task | Done |
|---|------|------|
| 1 | Confirm Phase 1 migration applied | ☐ |
| 2 | DB backup | ☐ |
| 3 | Run Option A **or** Option B.1–B.3 | ☐ |
| 4 | Verification queries (B.4) pass | ☐ |
| 5 | Deploy Phase 1.5 backend + frontend | ☐ |
| 6 | Admin re-login for new permissions | ☐ |
| 7 | Manual QA (checklist above) | ☐ |

**Related application changes (not SQL):** `companyAuditService.js`, company admin UI at `/settings/company-settings`, `POST /api/company-settings/switch`, `GET /api/company-settings/:id/audit`, route-level `requirePermission`, `CompanyContext` switch audit — see Phase 1.5 tasks 1–21 above.