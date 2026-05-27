
No numbering collision
No permission bypass
No migration corruption
No closed-period bypass
No VAT bypass
No cache contamination
No orphaned data

This phase is validation and hardening only.

Critical Rules

Do NOT:

Add new business modules
Rewrite accounting logic
Rewrite reports
Modify finance calculations
Redesign UI
Change posting formulas

Only:

Audit
Validate
Test
Monitor
Harden
Task 0 — Inspect Existing State

Inspect:

backend/src/tests
backend/src/services
backend/src/middleware
backend/src/models
backend/src/routes

frontend/src/contexts
frontend/src/pages
frontend/src/services

Search:

company_id
req.companyId
companyScope
resolveCompanyContext
audit
periodValidation
vatPeriod
documentNumber

Prepare internal note:

1. Existing company boundaries
2. Existing tests
3. Existing audit services
4. Existing validation helpers
5. Existing permissions
Task 1 — Create Data Integrity Service

Create:

backend/src/services/dataIntegrityAudit.service.js

Functions:

findCrossCompanyReferences()

findOrphanedRecords()

findNumberConflicts()

findMissingCompanyIds()

findInvalidFinancialReferences()

findClosedPeriodViolations()

findDuplicateAssignments()

findTemplateConflicts()

Return structure:

{
  "category":"Cross Company References",
  "severity":"HIGH",
  "count":5,
  "records":[]
}

Severity:

LOW
MEDIUM
HIGH
CRITICAL
Task 2 — Cross Company Relationship Audit

Validate:

Unit → Property
Lease → Property
Lease → Tenant
Lease → Unit
Invoice → Tenant
Invoice → Lease
Payment → Invoice
Payment → Bank
Cheque → Bank
JV → Accounts
Vendor Invoice → Vendor
Purchase Invoice → Vendor
AccountsTrans → Source Documents

Rule:

All related records must belong to same company_id

Audit result:

CROSS_COMPANY_DATA_INTEGRITY_FAILURE
Task 3 — Missing Company ID Audit

Search all company-scoped tables:

properties
units
tenants
leases
accounts_trans
payments
invoices
vendors
cheques
security_deposits
budgets
bank_accounts
JVs

Detect:

company_id IS NULL

Severity:

CRITICAL
Task 4 — Orphan Record Audit

Detect:

Invoice with deleted tenant
Payment with deleted invoice
Lease with deleted property
AccountsTrans with invalid source
PDC with missing bank

Severity:

HIGH
Task 5 — Numbering Integrity Audit

Validate:

Invoices
Receipts
Payments
JVs
PO
PI
Vendor Invoice
Cheques

Rules:

No duplicate number within same company
No skipped series if strict sequence enabled
Current series >= max document number

Audit:

NUMBERING_CONFLICT_FOUND
Task 6 — Financial Period Audit

Detect:

Posted transactions in HARD_CLOSED period
Non-admin posting in SOFT_CLOSED period
Documents outside fiscal year

Severity:

CRITICAL
Task 7 — VAT Integrity Audit

Validate:

Invoices modified after VAT SUBMITTED
Vendor invoices modified after VAT SUBMITTED
Transactions changed after VAT LOCKED

Audit:

VAT_PERIOD_VIOLATION
Task 8 — Permission Audit

Create:

permissionAudit.service.js

Check:

Users without required permissions
Inactive users with access
Users assigned to inactive companies
Missing permissions
Task 9 — Cache Leakage Audit

Frontend validation:

Switch:

Company A
→ Company B
→ Company A
→ Company B

Verify:

Dashboard
Reports
PDC
Finance
Tickets
Receivables

No old company data visible.

Task 10 — Create System Health Dashboard

Create:

/settings/system-health

Cards:

Cross-company violations
Orphan records
Number conflicts
Missing company IDs
Period violations
VAT violations
Permission issues
Total audit errors

Color:

Green
Yellow
Red
Task 11 — Background Audit Job

Create:

auditScheduler.service.js

Schedule:

Daily

Run:

Cross-company audit
Number audit
Period audit
VAT audit
Permission audit

Store results.

Task 12 — Audit Result Table

Create:

system_integrity_audits

Fields:

id
audit_type
severity
record_count
details_json
status
created_at
Task 13 — Audit APIs

Create:

GET /api/system-health
GET /api/system-health/audits
POST /api/system-health/run
GET /api/system-health/report

Permissions:

system_health.view
system_health.run
Task 14 — UAT Scenario Generator

Create:

backend/src/services/uatScenarioGenerator.service.js

Generate:

Multi-company posting scenarios
Cross-company attack scenarios
Period lock scenarios
VAT scenarios
Numbering scenarios
Task 15 — Automated UAT Dataset Seeder

Create:

backend/scripts/generate-phase2e-demo-data.js

Generate:

Company A
Company B

Properties
Units
Tenants
Leases
Invoices
Payments
JVs
PDC
Banks
Budgets
Task 16 — Audit Events

Add:

SYSTEM_INTEGRITY_SCAN_RUN
SYSTEM_INTEGRITY_FAILURE
CROSS_COMPANY_DATA_INTEGRITY_FAILURE
NUMBERING_CONFLICT_FOUND
PERIOD_VIOLATION_FOUND
VAT_PERIOD_VIOLATION
PERMISSION_AUDIT_FAILURE
Task 17 — Tests

Add backend tests:

Cross-company relation detection
Missing company detection
Orphan detection
Duplicate number detection
Closed period detection
VAT violation detection
Permission violation detection

Minimum:

30+ backend tests

Frontend:

System health page rendering
Audit filters
Company-switch cache checks
Task 18 — Performance Test

Run integrity audit on:

1000 tenants
5000 leases
10000 invoices
50000 accounting lines

Measure:

Execution time
Memory usage
Query count

Target:

<5 sec for audit summary
Task 19 — Manual QA Checklist

Test:

1 Create Company A/B
2 Generate data
3 Attempt cross-company links
4 Attempt period violations
5 Attempt VAT modifications
6 Attempt duplicate numbering
7 Switch companies repeatedly
8 Verify cache clears
9 Run integrity scan
10 Verify health dashboard
11 Verify scheduled audit results
Task 20 — Verification

Run:

cd backend
npm test
npm run lint
npm run typecheck

cd frontend
npm run build
npm run lint

---

## Live database scripts

Phase E requires migration `20260602100000-phase2e-system-integrity.js` for persisted audit results.

**Deploy order**

1. If `SequelizeMeta` is out of sync with an existing schema, baseline first: `node scripts/baseline-sequelize-meta.js` (from `backend`).
2. Run migration: `npx sequelize-cli db:migrate`
3. Deploy backend (registers `/api/system-health`, `/health/ready`, daily integrity scheduler at 02:00).
4. Deploy frontend (`/settings/system-health`).
5. Grant `module:system_health:view` and `module:system_health:run` to admin/manager roles (seeded via permissions config for new installs; existing DBs may need role permission sync).

**UAT demo data (dev only)**

```bash
cd backend
npm run seed:phase2e
```

**Verify**

```bash
cd backend
npm test -- phase2e-data-integrity
curl http://localhost:5002/health/ready
```