Phase 2C — Company-Wise Financial Reports, VAT, Dashboards & Visibility Separation
Current Status

Completed:

Phase 1
Phase 1.5
Phase 2A
Phase 2B

Already implemented:

company_settings company master
company_users
company switch
portfolio company scope
finance foundation separation
company-safe posting engine
company-safe accounting lines
cross-company posting audit

Current risk:

Reports and dashboards may still aggregate mixed-company data.
Objective

Make all reporting and visibility company-aware.

This phase must ensure:

Every report
Every KPI
Every dashboard
Every financial summary
Every VAT dataset
Every aging calculation
Every PDC report
Every treasury report

shows only active company data
Critical Rules

Do NOT:

rewrite accounting
rewrite posting logic
change debit-credit logic
change reconciliation algorithm
change invoice calculation
change VAT formula
change document numbering

Only:

apply company visibility isolation
Task 0 — Inspect Before Coding

Search:

reports
dashboard
treasury
vat
aging
financialReport
executiveDashboard
receivables
cashflow
kpi
statistics
summary
accounts_trans
groupBy
SUM(
COUNT(

Inspect:

backend/src/controllers/reports*
backend/src/controllers/dashboard*
backend/src/services/reports*
backend/src/services/dashboard*
backend/src/services/treasury*
backend/src/services/vat*
backend/src/services/finance*
frontend/src/pages/reports
frontend/src/pages/dashboard
frontend/src/pages/finance
frontend/src/pages/treasury

Prepare implementation note:

1. Report endpoints found
2. Dashboard KPI endpoints found
3. Financial aggregation services found
4. VAT services found
5. Treasury services found
6. Areas using raw SQL

Do not start coding before mapping.

Phase 2C Scope

Must include:

Financial reports
Treasury reports
Dashboard KPIs
VAT return datasets
Aging reports
PDC reports
Receivable reports
Payable reports
Cash/bank summaries
Budget summaries
Executive dashboard summaries
Task 1 — Create Report Company Context Helper

Create:

reportCompanyContext.service.js

Functions:

buildReportContext(req)

whereCompany(req)

applyCompanyFilter(query, companyId)

validateReportCompany(companyId)

Rules:

Never use company_id from request body
Always use req.companyId
Never use company_settings id=1 fallback
Task 2 — Centralize Financial Query Filters

Create helper:

applyFinancialCompanyScope()

Usage:

query.where.company_id=req.companyId

Support:

Sequelize queries
raw SQL
aggregate queries
subqueries
joins

For raw SQL:

Replace:

SELECT SUM(amount)
FROM accounts_trans

with:

SELECT SUM(amount)
FROM accounts_trans
WHERE company_id=:companyId
Task 3 — Dashboard KPI Isolation

Review all dashboard cards:

Examples:

Total Revenue
Total Receivables
Total Payables
Outstanding PDC
Occupancy %
Security Deposits
Monthly Collections
Lease Count
Property Count
Tenant Count

Rules:

KPI values use req.companyId only
No mixed-company totals
Task 4 — Executive Dashboard Isolation

For executive summaries:

Apply company scope to:

monthly revenue
collection trends
occupancy
lease trends
expense trends
cash position
budget utilization
aging

Rules:

All charts and summaries filtered by active company
Task 5 — Financial Report Isolation

Apply company filter to:

Trial Balance
General Ledger
Balance Sheet
Profit & Loss
Cash Flow
Account Statement
Transaction Listing
JV reports

Rules:

Only accounts_trans rows of req.companyId
Only company-owned accounts

Do not change calculations.

Task 6 — Receivable & Payable Aging

Apply company scope:

receivable aging
payable aging
tenant outstanding
vendor outstanding

Rules:

Invoice company_id=req.companyId
Payment company_id=req.companyId
Task 7 — Treasury Report Isolation

Apply scope to:

cash balances
bank balances
bank movements
treasury summaries
investments

Rules:

Only company-owned bank accounts
Only company-owned transactions
Task 8 — VAT Dataset Isolation

Apply company scope:

VAT purchase records
VAT sales records
VAT adjustments
VAT summaries

Rules:

VAT calculations unchanged
Only source data filtered

Add:

company TRN from active company_settings

Replace any:

findByPk(1)

with:

req.company
Task 9 — PDC Visibility Isolation

Apply company scope:

PDC register
PDC deposits
PDC status reports
undeposited PDC
returned PDC

Rules:

Only company-owned cheques
Task 10 — Budget Visibility Isolation

Apply scope:

budget summary
budget utilization
budget variance
budget KPI cards

Rules:

budget.company_id=req.companyId
Task 11 — Report Export Isolation

Review:

PDF exports
Excel exports
CSV exports
shared reports

Rules:

Export only active company data
Company logo from req.company
Company name from req.company
Company TRN from req.company
Task 12 — Frontend Company-Aware Refresh

On company switch:

Invalidate:

dashboard
reports
finance
treasury
vat
aging
budget
PDC

Example:

queryClient.invalidateQueries({
 queryKey:["dashboard"]
})
Task 13 — Report Headers

Update report headers:

Display:

Company Name
Company Logo
TRN
Address
Currency
Report Date

Source:

req.company
Task 14 — Cross Company Visibility Audit

Audit:

CROSS_COMPANY_REPORT_ACCESS_BLOCKED
REPORT_GENERATED
DASHBOARD_VIEWED
VAT_REPORT_GENERATED

Metadata:

company_id
report_type
filters
user_id
Task 15 — Frontend Empty States

If company has no data:

Show:

No records found for selected company

Do not show:

0 values mixed with old cached values
Task 16 — Tests

Add backend tests:

Dashboard KPIs isolated
Trial balance isolated
GL isolated
P&L isolated
Cash flow isolated
Receivable aging isolated
Payable aging isolated
Treasury isolated
VAT dataset isolated
PDC report isolated
Budget summary isolated
Report export isolated

Minimum:

20+ backend tests

Frontend:

Dashboard refreshes after company switch
Reports refresh after switch
VAT refresh after switch
Export uses company data
Task 17 — Manual QA

Test:

1 Create Company A/B
2 Post invoices/payments in both
3 Open dashboard Company A
4 Verify Company B values absent
5 Switch company
6 Verify KPI changes
7 Open Trial Balance
8 Verify only active company accounts
9 Open VAT return
10 Verify TRN/company values
11 Export reports
12 Verify company logo/header
13 Open PDC reports
14 Verify no leakage
15 Verify budget summary