Phase 2D — Company-Wise Configuration, Numbering & Closing Controls
Current Status

Completed:

Phase 1
Phase 1.5
Phase 2A
Phase 2B
Phase 2C

Current architecture:

Multi-company foundation
Company-safe finance posting
Company-safe reports
Company-safe dashboards
Company-safe exports

Remaining risk:

Document numbering
Fiscal periods
Closing rules
VAT periods
Company templates
Document branding
Opening balances
Objective

Implement company-level financial governance and document controls.

Every company must have independent:

document numbering
financial periods
VAT periods
document templates
report branding
opening balances
closing controls
Critical Rules

Do NOT:

rewrite accounting
rewrite posting engine
rewrite VAT calculations
rewrite report calculations
change transaction logic

Only:

add company configuration and controls
Task 0 — Inspect Existing Implementation

Search:

number
numbering
series
voucherNo
invoiceNo
documentNo
fiscal
period
closing
lock
vat
financialYear
openingBalance
template
logo
company_settings

Inspect:

backend/src/controllers
backend/src/services
backend/src/models
backend/src/routes
frontend/src/pages/settings
frontend/src/pages/finance

Prepare internal note:

Existing numbering logic
Existing financial period logic
Existing VAT settings
Existing report templates
Existing opening balance logic
Task 1 — Create Company Number Series Table

Create:

company_number_series

Fields:

id
company_id
document_type
prefix
suffix
current_number
padding
reset_type
is_active
created_at
updated_at

Relationships:

company_id → company_settings.id

Document types:

invoice
receipt
payment
journal_voucher
purchase_order
purchase_invoice
vendor_invoice
cheque
lease
property
tenant
budget

Rules:

One active series per company/document type

Unique:

(company_id, document_type)
Task 2 — Number Generation Service

Create:

documentNumberService.js

Methods:

generateDocumentNumber({
 companyId,
 documentType
})

previewDocumentNumber()

incrementSeries()

Example output:

Company A:

INV-000001
JV-000001

Company B:

INV-000001
JV-000001

Support:

daily
monthly
yearly
never

for resets.

Task 3 — Replace Hardcoded Numbering

Search:

invoiceNo
transactionNo
voucherNo
receiptNo
JV-
INV-
PO-

Replace generation only.

Do NOT rewrite document logic.

Use:

generateDocumentNumber()

Apply to:

Invoices
Receipts
Payments
JVs
Cheques
Purchase Orders
Purchase Invoices
Vendor Invoices
Budgets
Task 4 — Financial Year Table

Create:

company_financial_years

Fields:

id
company_id
year_name
start_date
end_date
is_current
is_closed
created_at
updated_at

Rules:

One active year per company
Task 5 — Financial Period Table

Create:

company_financial_periods

Fields:

id
financial_year_id
period_no
start_date
end_date
status
closed_by
closed_at

Statuses:

OPEN
SOFT_CLOSED
HARD_CLOSED
Task 6 — Period Validation Service

Create:

periodValidationService.js

Methods:

validatePostingDate()

validateDocumentDate()

isPeriodOpen()

Rules:

SOFT_CLOSED:
Allow admins only

HARD_CLOSED:
Block everyone

Error:

{
 "message":"Financial period is closed"
}
Task 7 — VAT Period Control

Create:

company_vat_periods

Fields:

id
company_id
period_name
start_date
end_date
status
submitted_at
submitted_by

Statuses:

OPEN
LOCKED
SUBMITTED

Rules:

Cannot modify VAT transactions after submitted
Task 8 — Company Template Configuration

Create:

company_document_templates

Fields:

id
company_id
document_type
header_template
footer_template
logo
signature
stamp
show_trn
show_bank
created_at
updated_at
Task 9 — Report Branding Isolation

Report exports:

PDF
Excel
CSV

Must use:

req.company.logo
req.company.company_name
req.company.vat_number
req.company.address
Task 10 — Opening Balance Separation

Create:

company_opening_balance_batches

Fields:

id
company_id
batch_name
balance_date
status
created_by
created_at

Rules:

Opening balances company-specific
Cannot import balances into wrong company
Task 11 — Company Closing APIs

Endpoints:

POST /api/financial-year/open
POST /api/financial-year/close

POST /api/financial-period/open
POST /api/financial-period/close

POST /api/vat-period/open
POST /api/vat-period/submit
Task 12 — Company Configuration UI

Create:

/settings/company-finance-config

Sections:

Number Series
Financial Years
Financial Periods
VAT Periods
Document Templates
Opening Balance Batches
Task 13 — Number Series UI

Display:

Document Type
Prefix
Current Number
Reset Rule
Preview
Status

Actions:

Create
Edit
Activate
Preview
Task 14 — Financial Period UI

Display:

Year
Period
Start
End
Status

Actions:

Open
Soft Close
Hard Close
Task 15 — Frontend Guards

When period closed:

Disable:

Post
Edit
Delete

Show:

This financial period is closed
Task 16 — Audit Events

Add:

NUMBER_SERIES_CREATED
FINANCIAL_YEAR_OPENED
FINANCIAL_YEAR_CLOSED
PERIOD_SOFT_CLOSED
PERIOD_HARD_CLOSED
VAT_PERIOD_SUBMITTED
OPENING_BALANCE_IMPORTED
Task 17 — Tests

Backend:

20+ tests minimum

Examples:

Invoice numbering isolated
JV numbering isolated
Financial year isolation
Period closing blocks posting
VAT period blocks changes
Opening balance isolation

Frontend:

Number preview
Period UI actions
Closed period disable state
Task 18 — Manual QA

Test:

1 Create Company A/B
2 Configure invoice series separately
3 Generate invoices
4 Verify numbering independent
5 Create financial periods
6 Close one period
7 Attempt posting
8 Verify blocked
9 Submit VAT period
10 Attempt edit
11 Verify blocked
12 Export report
13 Verify branding
14 Import opening balances
15 Verify company isolation

---

## Live database scripts

Phase D requires migration `20260601100000-phase2d-financial-governance.js` before period/VAT locks and company numbering take effect.

**Deploy order**

1. Run backend migration on the live database (creates six governance tables and seeds number series / default financial year per company).
2. Deploy backend API (registers `/api/company-finance/*` routes).
3. Deploy frontend (Company Finance Config at `/settings/company-finance-config`).

**Migration (from backend directory)**

```bash
cd backend
npx sequelize-cli db:migrate
```

**Verify**

```bash
npm test -- phase2d-financial-governance
```

**Notes**

- Existing companies receive default `company_number_series` rows copied from global `document_numbering` where mapped.
- Financial period enforcement applies on post/create/update hooks; deploy backend before enabling strict period closes in production.
- Grant `company_finance_config` module permissions to finance managers who configure numbering and periods.