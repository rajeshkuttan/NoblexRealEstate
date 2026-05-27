Phase 1 — Multi-Company Foundation Using Existing company_settings
Objective

Convert the current single-company Real Estate Lease Management application into a multi-company application inside one installation.

This is not SaaS multi-tenancy.

Target model:

One Application Installation
 └── Multiple Legal Companies
      └── Properties
           └── Units
                └── Tenants
                     └── Leases

Important: There is already an existing table:

company_settings

This table must be reused as the Company / Legal Entity master.

Do not create a new companies table in Phase 1.

Existing Table

Current table:

company_settings

Existing fields include:

id
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
is_active
created_at
updated_at
contract_terminology
emirate_authority_map

Use this table as:

company_settings.id = active company id

In all new scoped records:

company_id references company_settings(id)
Critical Rules

Cursor must follow these strictly:

Do not create a new companies table.
Do not rename company_settings.
Do not change the meaning of existing fields.
Do not break current company settings screen.
Do not modify finance posting logic in this phase.
Do not change PDC, GL, VAT, treasury, COA, journal, or bank posting logic.
Do not introduce SaaS tenant logic.
Do not add organization_id or tenant_id.
Do not refactor unrelated modules.
Preserve existing single-company behavior.
Phase 1 Scope

Implement only:

company_settings as multi-company master
company_users mapping
active company context
company switcher
company scoping for:
- properties
- units
- tenants
- leases

Optional only if low risk:

leads
legal_cases

Do not touch finance-heavy modules in Phase 1.

Task 0 — Inspect Before Editing

Before writing code, inspect the existing implementation.

Search for:

company_settings
CompanySettings
companySettings
company_setting
company_id
settings
id = 1
id: 1
findByPk(1)
where: { id: 1 }

Inspect these folders:

backend/src/models
backend/src/migrations
backend/src/controllers
backend/src/routes
backend/src/services
backend/src/middleware
backend/src/seeders
backend/src/app.ts
backend/src/server.ts

frontend/src
frontend/src/api
frontend/src/services
frontend/src/context
frontend/src/providers
frontend/src/components
frontend/src/layouts
frontend/src/pages
frontend/src/routes
frontend/src/App.tsx

Prepare a short implementation note before coding:

- Where company_settings is used
- Whether app assumes only one company_settings row
- Which APIs currently read/write company_settings
- Which modules can safely be scoped in Phase 1

Do not proceed with code until this inspection is complete.

Task 1 — Treat company_settings as Company Master

Update model/service naming carefully if needed, but do not rename database table.

Use current table as legal company master.

Expected backend behavior:

GET company_settings = list accessible companies
GET current company = active selected company
POST company_settings = create new company/legal entity
PUT company_settings/:id = update company/legal entity
PATCH company_settings/:id/status = activate/deactivate company

If existing APIs are single-record settings APIs, preserve them and add new company-aware APIs separately.

Preferred new routes:

GET    /api/company-settings
GET    /api/company-settings/current
POST   /api/company-settings
GET    /api/company-settings/:id
PUT    /api/company-settings/:id
PATCH  /api/company-settings/:id/status

Do not break existing routes if frontend already uses them.

Task 2 — Create company_users Table

Create migration and model:

company_users

Fields:

id
company_id
user_id
role_in_company nullable
is_default boolean default false
is_active boolean default true
created_at
updated_at

Relationships:

company_users.company_id → company_settings.id
company_users.user_id → users.id

Rules:

One user can access multiple companies.
One user should have only one default company.
Inactive company_user should block access.
Inactive company_settings should block access.

Indexes:

company_id
user_id
(company_id, user_id) unique
(user_id, is_default)

If DB supports partial unique index, enforce one default per user.

If not, enforce in service logic.

Task 3 — Backfill Existing Users

Create safe migration/seed script:

Find first active company_settings record.
If none exists, create one default company using existing required fields.
Assign all existing users to this default company in company_users.
Mark first/default company as is_default = true for existing users.

Default company name:

Default Company

But if an existing company_settings row already has a company name, do not overwrite it.

Task 4 — Add company_id to Core Tables

Add nullable first, backfill, then make non-null if safe.

Tables:

properties
units
tenants
leases

Optional only if easy:

leads
legal_cases

Migration flow:

1. Add company_id nullable
2. Backfill all existing rows with default company_settings.id
3. Add foreign key to company_settings(id)
4. Add index on company_id
5. Make company_id NOT NULL only after successful backfill

Do not delete data.

Do not alter existing primary keys.

Do not change existing relationships.

Task 5 — Backend Request Company Context

Create middleware:

resolveCompanyContext

Behavior:

Read active company from header:
x-company-id
Authenticated user is required.
If x-company-id exists:
verify user has active access in company_users
verify company_settings.is_active = true
attach to request:
req.companyId
req.company
If x-company-id is missing:
use user’s default company from company_users
if no default but only one active company exists, use that
if multiple companies exist, return:
{
  "message": "Company selection required"
}
Never trust company_id from request body.
Do not allow users to access companies not assigned to them.
Task 6 — TypeScript Request Typing

If backend uses TypeScript, extend Express request typing:

req.companyId?: number | string
req.company?: CompanySettings

Use actual existing project type patterns.

Do not introduce global type conflicts.

Task 7 — Apply Company Scope to Core Modules

Apply company filtering only to:

properties
units
tenants
leases

For each module:

Create

Force:

company_id = req.companyId

Ignore frontend/body company_id.

List

Add:

where.company_id = req.companyId

Preserve all existing filters.

Read by ID

Must query using:

id = req.params.id
company_id = req.companyId

Return 404 if record belongs to another company.

Update

Allow update only when:

id = req.params.id
company_id = req.companyId

Do not allow company_id change through update body.

Delete

Delete only when:

id = req.params.id
company_id = req.companyId

Do not change existing soft-delete behavior.

Task 8 — Important Relationship Rule

When creating child records, validate parent belongs to same company.

Examples:

Unit creation

If unit has property_id, verify:

property.company_id = req.companyId
Lease creation

If lease has:

property_id
unit_id
tenant_id

verify all belong to:

req.companyId
Tenant update

Do not allow tenant from Company A to be linked to lease in Company B.

Return clear error:

{
  "message": "Selected record does not belong to active company"
}
Task 9 — Company Settings APIs

Implement or adjust APIs so frontend can fetch accessible companies.

Required endpoint:

GET /api/company-settings/my-companies

Response:

[
  {
    "id": 1,
    "company_name": "Default Company",
    "company_name_arabic": null,
    "logo": null,
    "is_default": true,
    "is_active": true,
    "currency": "AED",
    "timezone": "Asia/Dubai"
  }
]

Required endpoint:

GET /api/company-settings/current

Uses resolveCompanyContext.

Response:

{
  "id": 1,
  "company_name": "Default Company",
  "currency": "AED",
  "timezone": "Asia/Dubai",
  "vat_number": "...",
  "logo": "..."
}

Admin endpoints:

POST   /api/company-settings
PUT    /api/company-settings/:id
PATCH  /api/company-settings/:id/status
GET    /api/company-settings/:id/users
POST   /api/company-settings/:id/users
DELETE /api/company-settings/:id/users/:userId

Reuse existing permission middleware.

Do not expose these publicly.

Task 10 — Frontend Company Provider

Create:

CompanyProvider
useCompany()

State:

companies
activeCompany
activeCompanyId
isCompanyLoading
switchCompany(companyId)
refreshCompanies()

Startup logic:

Fetch:
/api/company-settings/my-companies
Read from localStorage:
active_company_id
If stored company exists in allowed companies, use it.
Else use default company.
Else use first active company.
Save selected company to localStorage.
Fetch current company details if needed.
Task 11 — API Client Header

Modify existing API client/interceptor centrally.

Add header:

x-company-id: activeCompanyId

Rules:

Do not add header manually in every API call.
Preserve auth token behavior.
Preserve error handling.
If no active company yet, do not send invalid header.
After company switch, all new requests must use new company ID.
Task 12 — TanStack Query Cache Handling

On company switch:

queryClient.clear()

or safer:

queryClient.invalidateQueries()

Use the project’s existing cache strategy.

Goal:

Old company data must not remain visible after company switch.
Task 13 — Header Company Switcher

Add company switcher to main layout/header.

Display:

Current Company: [Company Name] ▼

Behavior:

If one company: show company name only.
If multiple companies: dropdown.
On switch:
call switchCompany(companyId)
update localStorage
invalidate queries
reload current route data
Show logo if available, but do not spend time on advanced design.
Task 14 — Company Management UI

Only if settings/admin pages already exist.

Add route:

/settings/company-settings

Features:

List companies
Create company
Edit company
Activate/deactivate company
Assign users
Remove users
Set default company for user

Keep UI simple.

Do not redesign the application.

Task 15 — Preserve Existing Single-Company Behavior

The application must still work if there is only one record in company_settings.

Expected behavior:

User logs in
Default company auto-selected
No forced selection screen
All existing properties/units/tenants/leases visible
Existing finance pages still load
Task 16 — Hardcoded Company Settings Cleanup

Search and handle:

findByPk(1)
where: { id: 1 }
company_settings id 1
settings.id = 1

Rules:

For lease/property/unit/tenant context, replace with req.companyId.
For global display settings, use active company where safe.
For finance modules, do not modify deeply in Phase 1.
If uncertain, leave old logic and add clear TODO:
// TODO Phase 2: make finance/settings company-aware
Task 17 — Security Checks

Add backend checks:

User cannot request company not assigned to them.
Inactive company cannot be selected.
Inactive company_user cannot access company.
Records from Company A cannot be read using Company B active context.
company_id in request body must be ignored.
Task 18 — Tests

Add or update tests if test structure exists.

Minimum backend tests:

User with one company gets default company context
User with multiple companies can switch via x-company-id
User cannot access unassigned company
Property list is filtered by company
Unit list is filtered by company
Tenant list is filtered by company
Lease list is filtered by company
Create property forces req.companyId
Body company_id is ignored
Cross-company parent validation fails

Frontend tests if existing:

CompanyProvider selects default company
Company switch updates localStorage
API client sends x-company-id
Company switch invalidates query cache
Task 19 — Build Verification

Run:

npm run build
npm run typecheck
npm run lint
npm test

If separate:

cd backend
npm run build
npm run typecheck
npm test

cd frontend
npm run build
npm run typecheck
npm run lint

Fix only errors related to this task.

Do not refactor unrelated warnings unless required for build.

Manual QA Checklist

Test exactly:

Login with existing user.
Confirm existing company auto-selected.
Open properties page.
Existing properties appear.
Open units page.
Existing units appear.
Open tenants page.
Existing tenants appear.
Open leases page.
Existing leases appear.
Create second company in company_settings.
Assign same user to second company.
Switch company from header.
Properties should be empty for new company.
Create property in new company.
Switch back to first company.
New company property must not appear.
Try opening new company property URL while first company is active.
Must return not found/access denied.
Open finance/PDC/VAT pages.
They must still load without broken posting logic

---

## Live database scripts — Phase 1 multi-company foundation

**Migration file (source of truth):** `backend/src/migrations/20260527100000-phase1-multi-company-foundation.js`

**Database:** MySQL (InnoDB)

**What this changes:**

| Step | Action |
|------|--------|
| 1 | Ensures at least one active row in `company_settings` (creates “Default Company” only if none exist) |
| 2 | Creates `company_users` |
| 3 | Adds `company_id` to `properties`, `units`, `tenants`, `leases` (backfill → NOT NULL + indexes + FKs) |
| 4 | Seeds every `users` row into `company_users` for the default company (`is_default = 1`) |

**Does not change:** finance/GL/PDC/VAT tables, `company_settings` column definitions, COA, journals, etc.

### Before you run on LIVE

1. **Full backup** of the production database (dump + verify restore).
2. **Maintenance window** — stop or drain write traffic if possible.
3. **Deploy order:** run DB scripts (or `npm run migrate`) **before** deploying the Phase 1 backend build that sends `x-company-id` and scopes portfolio APIs.
4. **CORS / app config (not SQL):** production API must allow header `X-Company-Id` (see `backend/src/app.js` `allowedHeaders`).
5. **Record migration** in table `migrations` if you run SQL manually (see section 5 below).

---

### Option A — Recommended: run via project migrator (LIVE connection)

Point `backend/config.env` (or production env) at the **LIVE** database, then:

```bash
cd backend
npm run migrate
```

This runs all pending migrations in order and inserts `20260527100000-phase1-multi-company-foundation.js` into `migrations` automatically.

**Check status:**

```sql
SELECT name, executed_at FROM migrations ORDER BY id DESC LIMIT 20;
```

**Skip Option B** if Option A succeeds.

---

### Option B — Manual SQL for LIVE (MySQL)

Run in order in a single session (Workbench, `mysql` CLI, or DBA tool). Use `START TRANSACTION` / `COMMIT` if your tool supports it.

#### B.0 — Pre-flight checks (read-only)

```sql
-- Already applied?
SELECT name, executed_at FROM migrations
WHERE name = '20260527100000-phase1-multi-company-foundation.js';

SELECT COUNT(*) AS company_users_exists
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'company_users';

SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name IN ('properties', 'units', 'tenants', 'leases')
  AND column_name = 'company_id';

-- Default company candidate
SELECT id, company_name, is_active
FROM company_settings
WHERE is_active = 1
ORDER BY id ASC
LIMIT 5;

SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS properties_count FROM properties;
SELECT COUNT(*) AS units_count FROM units;
SELECT COUNT(*) AS tenants_count FROM tenants;
SELECT COUNT(*) AS leases_count FROM leases;
```

If `migrations` already contains the Phase 1 name **or** `company_users` exists with all four `company_id` columns, **do not re-run** the forward script.

---

#### B.1 — Resolve default `company_settings.id`

```sql
START TRANSACTION;

SET @default_company_id := (
  SELECT id FROM company_settings WHERE is_active = 1 ORDER BY id ASC LIMIT 1
);

-- Only if no active company exists (matches migration logic)
INSERT INTO company_settings (
  company_name, currency, timezone, language, country,
  is_active, contract_terminology, created_at, updated_at
)
SELECT
  'Default Company', 'AED', 'Asia/Dubai', 'en', 'UAE',
  1, 'Ejari', NOW(), NOW()
FROM DUAL
WHERE @default_company_id IS NULL;

SET @default_company_id := COALESCE(
  @default_company_id,
  (SELECT id FROM company_settings WHERE is_active = 1 ORDER BY id ASC LIMIT 1)
);

SELECT @default_company_id AS default_company_id;
```

**Important:** Existing `company_name` values are **not** overwritten. A new row is inserted only when there is no active `company_settings` row.

---

#### B.2 — Create `company_users`

```sql
CREATE TABLE IF NOT EXISTS company_users (
  id INT NOT NULL AUTO_INCREMENT,
  company_id INT NOT NULL,
  user_id INT NOT NULL,
  role_in_company VARCHAR(100) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_company_users_company_user (company_id, user_id),
  KEY idx_company_users_company_id (company_id),
  KEY idx_company_users_user_id (user_id),
  KEY idx_company_users_user_default (user_id, is_default),
  CONSTRAINT fk_company_users_company_id
    FOREIGN KEY (company_id) REFERENCES company_settings (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_company_users_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### B.3 — Add `company_id` to portfolio tables (properties → units → tenants → leases)

Run each block once per table. If a column already exists, skip that table’s `ADD COLUMN` and run only `UPDATE` / `MODIFY` / index / FK as needed.

**properties**

```sql
ALTER TABLE properties ADD COLUMN company_id INT NULL;

UPDATE properties SET company_id = @default_company_id WHERE company_id IS NULL;

ALTER TABLE properties MODIFY company_id INT NOT NULL;

ALTER TABLE properties
  ADD INDEX idx_properties_company_id (company_id);

ALTER TABLE properties
  ADD CONSTRAINT fk_properties_company_id
  FOREIGN KEY (company_id) REFERENCES company_settings (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;
```

**units**

```sql
ALTER TABLE units ADD COLUMN company_id INT NULL;

UPDATE units SET company_id = @default_company_id WHERE company_id IS NULL;

ALTER TABLE units MODIFY company_id INT NOT NULL;

ALTER TABLE units
  ADD INDEX idx_units_company_id (company_id);

ALTER TABLE units
  ADD CONSTRAINT fk_units_company_id
  FOREIGN KEY (company_id) REFERENCES company_settings (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;
```

**tenants**

```sql
ALTER TABLE tenants ADD COLUMN company_id INT NULL;

UPDATE tenants SET company_id = @default_company_id WHERE company_id IS NULL;

ALTER TABLE tenants MODIFY company_id INT NOT NULL;

ALTER TABLE tenants
  ADD INDEX idx_tenants_company_id (company_id);

ALTER TABLE tenants
  ADD CONSTRAINT fk_tenants_company_id
  FOREIGN KEY (company_id) REFERENCES company_settings (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;
```

**leases**

```sql
ALTER TABLE leases ADD COLUMN company_id INT NULL;

UPDATE leases SET company_id = @default_company_id WHERE company_id IS NULL;

ALTER TABLE leases MODIFY company_id INT NOT NULL;

ALTER TABLE leases
  ADD INDEX idx_leases_company_id (company_id);

ALTER TABLE leases
  ADD CONSTRAINT fk_leases_company_id
  FOREIGN KEY (company_id) REFERENCES company_settings (id)
  ON UPDATE CASCADE ON DELETE RESTRICT;
```

---

#### B.4 — Seed `company_users` for all existing users

Idempotent: only inserts users not already linked to the default company.

```sql
INSERT INTO company_users (
  company_id, user_id, role_in_company, is_default, is_active, created_at, updated_at
)
SELECT
  @default_company_id,
  u.id,
  NULL,
  1,
  1,
  NOW(),
  NOW()
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM company_users cu
  WHERE cu.company_id = @default_company_id AND cu.user_id = u.id
);

COMMIT;
```

---

#### B.5 — Register migration (required if you used manual SQL, not `npm run migrate`)

```sql
INSERT INTO migrations (name)
SELECT '20260527100000-phase1-multi-company-foundation.js'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM migrations
  WHERE name = '20260527100000-phase1-multi-company-foundation.js'
);
```

---

#### B.6 — Post-migration verification (read-only)

```sql
SELECT @default_company_id := (
  SELECT id FROM company_settings WHERE is_active = 1 ORDER BY id ASC LIMIT 1
) AS default_company_id;

SELECT COUNT(*) AS company_users_count FROM company_users;
SELECT COUNT(*) AS users_without_membership
FROM users u
LEFT JOIN company_users cu ON cu.user_id = u.id AND cu.is_active = 1
WHERE cu.id IS NULL;

SELECT 'properties' AS tbl, COUNT(*) AS total, SUM(company_id IS NULL) AS null_company_id FROM properties
UNION ALL
SELECT 'units', COUNT(*), SUM(company_id IS NULL) FROM units
UNION ALL
SELECT 'tenants', COUNT(*), SUM(company_id IS NULL) FROM tenants
UNION ALL
SELECT 'leases', COUNT(*), SUM(company_id IS NULL) FROM leases;

SELECT name, executed_at FROM migrations
WHERE name = '20260527100000-phase1-multi-company-foundation.js';
```

**Expected:** `null_company_id` = 0 for all four tables; `users_without_membership` = 0; migration row present.

---

### Option C — LIVE helpers after Phase 1 (optional QA / second company)

Use after forward migration. Adjust names and IDs for your environment.

**Create a second legal company (example)**

```sql
INSERT INTO company_settings (
  company_name, currency, timezone, language, country,
  is_active, contract_terminology, created_at, updated_at
) VALUES (
  'Second Legal Entity LLC', 'AED', 'Asia/Dubai', 'en', 'UAE',
  1, 'Ejari', NOW(), NOW()
);

SET @second_company_id := LAST_INSERT_ID();
SELECT @second_company_id AS second_company_id;
```

**Assign an existing user to the second company (replace `:user_id`)**

```sql
SET @second_company_id := (
  SELECT id FROM company_settings WHERE company_name = 'Second Legal Entity LLC' LIMIT 1
);
SET @user_id := 1;  -- CHANGE ME

INSERT INTO company_users (
  company_id, user_id, role_in_company, is_default, is_active, created_at, updated_at
) VALUES (
  @second_company_id, @user_id, NULL, 0, 1, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE is_active = 1, updated_at = NOW();
```

**List companies for a user**

```sql
SET @user_id := 1;  -- CHANGE ME

SELECT cs.id, cs.company_name, cu.is_default, cu.is_active
FROM company_users cu
INNER JOIN company_settings cs ON cs.id = cu.company_id
WHERE cu.user_id = @user_id
ORDER BY cu.is_default DESC, cs.company_name ASC;
```

---

### Rollback script (LIVE — use only if you must undo Phase 1 DB changes)

**Warning:** Drops `company_users` and removes `company_id` from portfolio tables. Data in `company_id` columns is lost. Take a backup first. Finance tables are untouched.

```sql
START TRANSACTION;

-- Portfolio tables (order does not matter for DROP COLUMN if no dependent FKs from other tables)
ALTER TABLE leases DROP FOREIGN KEY fk_leases_company_id;
ALTER TABLE leases DROP INDEX idx_leases_company_id;
ALTER TABLE leases DROP COLUMN company_id;

ALTER TABLE tenants DROP FOREIGN KEY fk_tenants_company_id;
ALTER TABLE tenants DROP INDEX idx_tenants_company_id;
ALTER TABLE tenants DROP COLUMN company_id;

ALTER TABLE units DROP FOREIGN KEY fk_units_company_id;
ALTER TABLE units DROP INDEX idx_units_company_id;
ALTER TABLE units DROP COLUMN company_id;

ALTER TABLE properties DROP FOREIGN KEY fk_properties_company_id;
ALTER TABLE properties DROP INDEX idx_properties_company_id;
ALTER TABLE properties DROP COLUMN company_id;

DROP TABLE IF EXISTS company_users;

DELETE FROM migrations
WHERE name = '20260527100000-phase1-multi-company-foundation.js';

-- NOTE: Does NOT delete rows inserted into company_settings by B.1 ("Default Company").
-- Remove manually only if that row was created by this migration and is unused.

COMMIT;
```

If MySQL reports unknown constraint names, list them first:

```sql
SELECT CONSTRAINT_NAME, TABLE_NAME
FROM information_schema.TABLE_CONSTRAINTS
WHERE table_schema = DATABASE()
  AND table_name IN ('properties', 'units', 'tenants', 'leases')
  AND constraint_type = 'FOREIGN KEY';
```

---

### Implementation checklist (LIVE)

| # | Task | Done |
|---|------|------|
| 1 | DB backup | ☐ |
| 2 | Run Option A **or** Option B.1–B.6 | ☐ |
| 3 | Verification queries (B.6) all pass | ☐ |
| 4 | Deploy Phase 1 backend + frontend | ☐ |
| 5 | Confirm `X-Company-Id` allowed in production CORS | ☐ |
| 6 | Manual QA (Task 19 checklist above) | ☐ |

**Related application changes (not SQL):** `company_users` model, `companyContextService`, `resolveCompanyContext` middleware, portfolio `company_id` scoping, `CompanyProvider` + `x-company-id` header, CORS `X-Company-Id`, Sequelize alias `companySetting` on `CompanyUser` → `CompanySetting`.

