Phase 2A — Finance Foundation Separation for Multi-Company Lease Management
Current Status

Phase 1 and Phase 1.5 are complete.

Already implemented:

company_settings used as company master
company_users mapping
active company context
x-company-id header
CompanyContext frontend
company switcher
company admin UI
company audit logs
properties/units/tenants/leases scoped by company
finance/GL/PDC/treasury still untouched
Objective

Implement finance foundation separation by adding company awareness to finance master/configuration tables and financial base records.

This phase must prepare finance for company-wise separation without changing posting logic yet.

This is a foundation phase only.

Very Important Rule

Do not rewrite finance posting logic in Phase 2A.

Do not change:

PDC deposit posting
journal posting engine
VAT calculation logic
bank reconciliation logic
invoice posting logic
receipt/payment posting logic
treasury posting logic

Phase 2A is only:

Add company_id
Backfill company_id
Add safe filters where low-risk
Prevent cross-company selection in UI dropdowns
Prepare finance tables for Phase 2B
Core Principle

All finance configuration and financial records must now belong to:

company_settings.id

Use:

company_id references company_settings(id)

Do not create:

companies
tenants
organizations
Task 0 — Inspect Before Coding

Cursor must inspect all finance-related models, migrations, controllers, routes, and frontend services first.

Search:

chart_of_accounts
accounts
ledger
journal
voucher
invoice
payment
cheque
pdc
bank
treasury
vat
tax
budget
vendor
security_deposit
financial_transaction
accounts_trans
company_id
company_settings
findByPk(1)
where: { id: 1 }

Inspect folders:

backend/src/models
backend/src/migrations
backend/src/controllers
backend/src/routes
backend/src/services
backend/src/middleware
backend/src/utils

frontend/src/pages/finance
frontend/src/pages/receivables
frontend/src/pages/treasury
frontend/src/pages/vendors
frontend/src/pages/chart-of-accounts
frontend/src/pages/journal-vouchers
frontend/src/pages/budget
frontend/src/services
frontend/src/api

Prepare an internal implementation note:

1. Finance tables found
2. Existing posting services found
3. Existing reporting services found
4. Tables safe for company_id migration now
5. Tables to leave untouched until Phase 2B

Do not guess table names. Use actual project names.

Phase 2A Scope
Must include

Add company_id to foundation/master tables:

chart_of_accounts
ledger_setups
bank_accounts
vendors
budgets
budget_lines
journal_vouchers
journal_voucher_lines
security_deposits
cheques
payments
invoices / receivables tables
vendor_invoices
purchase_orders if already finance-linked
purchase_invoices if already finance-linked
accounts_trans / financial_transactions

Use actual existing table names.

Optional only if clearly present
tax_profiles
vat_returns
bank_reconciliations
bank_transactions
standing_orders
payment_reminders
credit_limits
investments
exchange_rates
Do not include in this phase

Do not modify deep posting behavior for:

PDC GL posting
VAT return posting
bank reconciliation calculation
payment allocation engine
journal posting service
financial report calculations

Only add company foundation and basic scoping.

Task 1 — Migration Strategy

Create one clear migration:

20260529xxxxxx-phase2a-finance-company-foundation.js

Migration must:

1. Add company_id nullable to selected finance tables
2. Backfill existing records to default company_settings.id
3. Add index on company_id
4. Add foreign key to company_settings(id)
5. Make company_id NOT NULL only after safe backfill

Default company lookup:

SELECT id FROM company_settings WHERE is_active = true ORDER BY id ASC LIMIT 1;

Fallback:

If no company_settings row exists, create or reuse existing project default pattern.

Do not drop data.

Do not rename tables.

Do not change existing IDs.

Task 2 — Company ID Propagation Rules

For new finance records:

company_id must always come from req.companyId

Never trust:

req.body.company_id

Create/update rules:

Create: force company_id = req.companyId
Update: remove/ignore company_id from payload
Read/list: filter by req.companyId where safe
Delete: restrict by req.companyId where safe
Task 3 — Apply Scope to Finance Master Data First

Apply req.companyId filtering to master/setup records:

chart_of_accounts
ledger_setups
bank_accounts
vendors
budgets

Rules:

List only active company data
Create under active company
Update only active company data
Delete/deactivate only active company data

This is safer than transaction posting changes.

Task 4 — Chart of Accounts Separation

For COA:

Each company has its own COA.

Rules:

COA code uniqueness must become company-wise, not global.

If current unique index exists on:

account_code

change to:

(company_id, account_code)

Do not delete existing account codes.

For existing records:

Backfill company_id = default company

Add guard:

Cannot select COA account from another company.
Task 5 — Bank Account Separation

For bank accounts:

Bank accounts must be company-specific.

Rules:

List bank accounts by req.companyId
Create bank account under active company
Do not allow payment/PDC/deposit selection of bank account from another company

Do not change PDC posting formula yet.

Only validate selected bank belongs to active company.

Task 6 — Vendor Separation

For vendors:

Vendor records should belong to active company.

Decision:

Use company-specific vendors for now.

Rules:

List vendors by active company
Create vendor with company_id
Vendor invoices must reference vendor from same company
Purchase orders must reference vendor from same company if purchase orders are included

Do not create global vendor master in this phase.

Task 7 — Budget Separation

For budgets:

Budgets and budget lines must be company-specific.

Rules:

budget.company_id = req.companyId
budget_lines.company_id = req.companyId if table supports it
budget_lines must belong to budget of same company

If budget lines are always accessed through budget, adding company_id to budget only is acceptable, but document decision.

Task 8 — Journal Voucher Foundation

Add company_id to:

journal_vouchers
journal_voucher_lines if table exists

Rules:

Journal voucher header must be company-specific.
Lines must not reference COA from another company.

Do not rewrite posting logic.

Only add validation:

selected debit/credit account must belong to req.companyId
Task 9 — Cheques / PDC Foundation

Add company_id to:

cheques

Rules:

Existing cheques backfilled to default company.
New cheques use req.companyId.
Cheque list filters by req.companyId.
Cheque deposit bank account must belong to req.companyId.

Do not change existing deposit posting entries:

Dr Bank
Cr PDC

Only ensure selected bank/PDC/cheque are from active company.

Task 10 — Security Deposits Foundation

Add company_id to:

security_deposits

Rules:

Security deposit must belong to active company.
Lease referenced must belong to active company.
Tenant referenced must belong to active company.

Do not change accounting posting logic yet.

Task 11 — Payment / Receipt Foundation

Add company_id to payment-related tables.

Use actual table names:

payments
tenant_payments
receipts
payment_allocations

Rules:

Create payment under req.companyId
Payment lease/tenant/invoice must belong to req.companyId
List payment records by req.companyId

Do not rewrite allocation engine.

Task 12 — Invoice / Receivable Foundation

Add company_id to invoice/receivable tables.

Use actual project names:

invoices
receivables
invoice_items
tenant_invoices

Rules:

Create invoice under req.companyId
Invoice tenant/lease/property/unit must belong to req.companyId
Invoice list filters by req.companyId
Invoice numbering is not changed in Phase 2A unless existing numbering already supports company context

Add TODO:

// TODO Phase 2B: company-wise invoice numbering and posting separation
Task 13 — Accounts Transactions Foundation

Add company_id to:

accounts_trans
financial_transactions
ledger_transactions

Use actual table names.

Rules:

Existing transactions backfilled to default company.
New transaction creation should carry req.companyId if caller has company context.
Do not rewrite report calculations yet.

Add TODO in reporting services:

// TODO Phase 2C: filter financial reports by company_id
Task 14 — Company Scope Middleware for Finance

Create reusable helper:

financeCompanyScope

or extend existing:

companyScope.js

Helpers:

forceCompanyId(payload, req.companyId)
stripCompanyIdFromBody(req)
whereCompany(req)
assertRecordInCompany(model, id, companyId)
assertAccountInCompany(accountId, companyId)
assertBankInCompany(bankId, companyId)
assertVendorInCompany(vendorId, companyId)
assertInvoiceInCompany(invoiceId, companyId)

Do not duplicate logic across controllers.

Task 15 — Frontend Dropdown Filtering

Ensure dropdowns are company-aware via existing API filtering.

Affected dropdowns:

COA account dropdowns
bank account dropdowns
vendor dropdowns
budget dropdowns
journal account selectors
PDC deposit bank selector
payment invoice selector
tenant/lease selector in finance screens

Frontend should not send company_id.

Backend must enforce company.

Task 16 — Frontend UX Safeguards

When company switches:

Clear finance forms
Invalidate finance queries
Do not keep selected COA/bank/vendor from previous company

If forms are open and company switch happens:

reset selected finance dropdown values

No complex dirty-form protection unless existing pattern supports it.

Task 17 — Reports: Do Not Fully Change Yet

Do not rewrite reports.

Only add clear TODO markers in report services:

// TODO Phase 2C: apply company_id filter to financial reports

But if a report directly lists records from now-scoped tables and can safely accept req.companyId, add basic filtering.

Do not change financial totals logic deeply.

Task 18 — Audit Events

Add audit events:

FINANCE_COMPANY_SCOPE_ADDED
CROSS_COMPANY_FINANCE_ACCESS_BLOCKED
FINANCE_MASTER_CREATED
FINANCE_MASTER_UPDATED

Minimum log when:

User attempts to select account/bank/vendor/invoice from another company.

Use existing audit service.

Task 19 — Permission Safety

Do not create new permission architecture.

Existing finance permissions remain unchanged.

Company scope is not a permission.

It is a data boundary.

Task 20 — Tests

Add backend tests:

COA list filters by company
COA create forces req.companyId
COA body company_id ignored
Duplicate COA code allowed across different companies
Duplicate COA code blocked within same company
Bank account list filters by company
Vendor list filters by company
Budget list filters by company
Cheque list filters by company
Payment create rejects invoice from another company
Journal voucher rejects account from another company
PDC deposit rejects bank from another company

Add frontend tests if existing:

Company switch invalidates finance queries
COA dropdown reloads after company switch
Bank dropdown reloads after company switch
Vendor dropdown reloads after company switch
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

Fix only Phase 2A-related issues.

Manual QA Checklist

Test:

1. Login as admin.
2. Confirm Company A selected.
3. Open COA.
4. Existing COA records show.
5. Create Company B.
6. Assign user to Company B.
7. Switch to Company B.
8. COA should be empty or company-specific.
9. Create COA account in Company B using same account code as Company A.
10. It should be allowed.
11. Create bank account in Company B.
12. Switch back to Company A.
13. Company B bank account must not show.
14. Create vendor in Company B.
15. Vendor must not show in Company A.
16. Try to create journal voucher using Company A account while Company B active.
17. Must be blocked.
18. Try PDC deposit using bank from another company.
19. Must be blocked.
20. Open finance/PDC/VAT screens.
21. They must load.
22. Existing posting behavior must not be changed.

---

## Live database scripts — Phase 2A finance company foundation

**Migration file (source of truth):** `backend/src/migrations/20260529100000-phase2a-finance-company-foundation.js`

**Database:** MySQL (InnoDB)

**Prerequisite:** Phase 1 / 1.5 applied (`company_settings`, `company_users`, portfolio `company_id`).

**What this changes:**

| Step | Action |
|------|--------|
| 1 | Resolves default active `company_settings.id` (or creates “Default Company” if none) |
| 2 | Adds `company_id` to 21 finance tables (nullable → backfill → NOT NULL → index; FK added when possible) |
| 3 | Syncs `budget_categories`, `journal_voucher_details`, `payment_invoice_allocations` from parent rows |
| 4 | Replaces single-column uniques with composite `(company_id, …)` on COA codes, bank account/IBAN, vendor email/TRN, JV/payment/invoice numbers, etc. |

**Tables:** `chart_of_accounts`, `ledger_setups`, `bank_accounts`, `vendors`, `budgets`, `budget_categories`, `journal_vouchers`, `journal_voucher_details`, `cheques`, `payments`, `payment_invoice_allocations`, `invoices`, `vendor_invoices`, `security_deposits`, `accounts_trans`, `financial_transactions`, `purchase_orders`, `purchase_invoices`, `bank_transactions`, `reconciliations`, `bank_statement_imports`

**Does not change:** posting engines, VAT aggregation logic, document numbering, financial report calculations, bank reconciliation algorithms.

### Before you run on LIVE

1. **Full backup** of the production database.
2. **Maintenance window** recommended — migration touches many finance tables.
3. **Deploy order:** run migration **before** deploying backend that mounts `resolveCompanyContext` on finance routes and frontend that invalidates finance cache on company switch.
4. **Header:** clients must send `X-Company-Id` for finance APIs (same as portfolio).
5. **Record migration** in `migrations` if running SQL manually.

### Option A — Recommended

```bash
cd backend
npm run migrate
```

Pending migration name: `20260529100000-phase2a-finance-company-foundation.js`

**Verify:**

```sql
SELECT name FROM migrations WHERE name LIKE '%phase2a%';
SHOW COLUMNS FROM chart_of_accounts LIKE 'company_id';
SHOW INDEX FROM chart_of_accounts WHERE Key_name = 'uq_coa_company_account_code';
```

### Option B — Manual outline (DBA)

For each table in the list above (skip if `company_id` already exists):

```sql
-- Example for chart_of_accounts
ALTER TABLE chart_of_accounts ADD COLUMN company_id INT NULL;
UPDATE chart_of_accounts SET company_id = @default_company_id WHERE company_id IS NULL;
ALTER TABLE chart_of_accounts MODIFY company_id INT NOT NULL;
CREATE INDEX idx_chart_of_accounts_company_id ON chart_of_accounts (company_id);
-- Drop old single-column unique on account_code, then:
CREATE UNIQUE INDEX uq_coa_company_account_code ON chart_of_accounts (company_id, account_code);
```

Repeat pattern for other tables per migration file composite index names.

### Rollback

```bash
cd backend
npm run migrate:down
```

Or run `down()` in the migration file (drops composite uniques and `company_id` columns in reverse table order). **Only on a restore/rollback plan** — not for production rollback after live use of multi-company finance data.

### Post-migration checklist

- [ ] All finance tables have `company_id` NOT NULL
- [ ] Legacy rows point at default company
- [ ] Same COA code can exist in two companies (composite unique only)
- [ ] Finance screens load with company selected
- [ ] Cross-company JV / PDC deposit blocked (manual QA items 16–19 above)