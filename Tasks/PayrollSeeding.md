Payroll Full-Cycle Sample Data Seeder + End-to-End Validation
Objective

Create a production-grade payroll demo/UAT data seeder and automated validation flow to test the complete Payroll module from foundation to documents.

The script must seed realistic UAE payroll sample data and then validate that the complete payroll cycle works correctly.

This must cover:

P1 — Payroll Foundation
P2 — Attendance / Leave / Timesheet
P3 — Payroll Calculation
P4 — WPS & UAE Compliance
P5 — EOS / Final Settlement
P6 — Payroll Finance Posting
P7 — Payslip / Documents / Reports
Critical Rules

Do not modify payroll business logic.

Do not modify existing migrations.

Do not hardcode IDs.

Do not bypass company isolation.

Do not create duplicate records on repeated execution.

The seeder must be:

idempotent
company-aware
safe for local/dev/UAT
not for live production unless explicitly enabled

Add environment safety:

Block execution when NODE_ENV=production unless ALLOW_PAYROLL_DEMO_SEED=true
Deliverables

Create:

backend/src/scripts/seed-payroll-full-cycle.js
backend/src/scripts/validate-payroll-full-cycle.js
backend/src/tests/payroll/full-cycle/payroll-full-cycle.test.js

Optional but recommended:

backend/src/scripts/cleanup-payroll-demo-data.js

Add package scripts:

{
  "seed:payroll-full-cycle": "node src/scripts/seed-payroll-full-cycle.js",
  "validate:payroll-full-cycle": "node src/scripts/validate-payroll-full-cycle.js",
  "test:payroll-full-cycle": "jest backend/src/tests/payroll/full-cycle/payroll-full-cycle.test.js"
}

Use project’s actual test command format.

Part A — Seed Data
1. Company Setup

Use existing company context.

Create or reuse demo company:

Payroll Demo Real Estate LLC

Set:

company_name
TRN
address
currency = AED
timezone = Asia/Dubai
fiscal year

Do not create a new company if it already exists.

2. Company Finance Configuration

Ensure company has:

financial year
financial periods
VAT periods if required
document number series
document templates

Seed payroll document series:

PAYROLL-RUN
PAYSLIP
WPS-BATCH
SETTLEMENT
SALARY-CERTIFICATE
3. Payroll Organization Data

Seed:

Visa Sponsor Company
Branch
Departments
Designations
Grades
Employment Categories
Workforce Groups
Payroll Groups
Cost Centers
Work Locations

Minimum departments:

Property Management
Leasing
Maintenance
Finance
Administration

Workforce groups:

Staff
Labour
Management
Technical
4. Shift / Calendar / Leave Foundation

Seed:

Shift Masters
Holiday Calendar
Work Calendar
Leave Types
Leave Policies
Leave Policy Assignments

Leave types:

Annual Leave
Sick Leave
Unpaid Leave
Emergency Leave

Shift examples:

Office Shift: 09:00–18:00
Labour Shift: 08:00–17:00
Maintenance Shift: 07:00–16:00
5. Payroll Components

Seed earnings:

Basic Salary
Housing Allowance
Transport Allowance
Food Allowance
Overtime
Bonus

Seed deductions:

Loan Recovery
Salary Advance Recovery
Penalty
Unpaid Leave Deduction

Seed provisions/employer components:

EOS Provision
Employer Contribution

Ensure:

calculation_method
overtime_multiplier
affects_wps
affects_eos

are properly configured.

6. Employees

Seed at least 12 employees:

3 Management
4 Staff
3 Labour
2 Technical

Include UAE compliance variety:

Bank transfer employee with valid IBAN
Salary card employee
UAE national / GPSSA eligible employee
Employee with document expiring soon
Employee with loan
Employee with approved leave
Employee with unpaid leave
Employee with overtime
Employee for final settlement

Required employee fields:

employee_no
name
nationality
gender
joining_date
status
visa sponsor
department
designation
workforce group
payroll group
cost center
contract_type
uae_national
gpssa_eligible
7. Employee Documents

Seed documents:

Passport
Visa
Emirates ID
Labour Card
Medical Insurance
Employment Contract

Include:

valid documents
one expiring within 30 days
one expired document for compliance warning
8. Employee Bank / WPS Data

Seed:

IBAN
bank_name
bank_code
salary_card_no
labour_card_no
mol_personal_id
wps_enabled
payment_method

Include:

valid WPS employee
salary card employee
non-WPS cash employee
one invalid/missing IBAN employee for validation test

The validation script must confirm WPS blocks invalid mandatory cases.

9. Salary Structures

Create approved salary structures for all employees.

Examples:

Management:

Basic 18000
Housing 6000
Transport 1500

Staff:

Basic 7000
Housing 2500
Transport 750

Labour:

Basic 1800
Housing 500
Transport 300
Food 250

Technical:

Basic 3500
Housing 1000
Transport 500
10. Leave Opening Balances

For each employee:

Annual Leave opening balance: 30 days
Sick Leave opening balance: 15 days

Approve balances.

11. Leave Applications

Seed:

Paid annual leave for one staff employee
Unpaid leave for one labour employee
Sick leave for one employee
Rejected leave scenario
Cancelled leave scenario

Approve required leaves.

Ensure leave affects attendance summary.

12. Attendance / Timesheet Cycle

Create one payroll month.

Example:

June 2026

Seed:

Staff auto attendance
Labour timesheets
Overtime approvals
Attendance adjustments
Missing attendance exception

Then:

Generate attendance period
Approve attendance period
Lock attendance period

Validation must confirm:

payable_days = present_days + paid_leave_days + holiday_days
unpaid leave excluded
overtime captured
13. Monthly Adjustments

Seed:

Bonus for one employee
Penalty deduction for one employee
Manual allowance for one employee

Approve adjustments.

14. Employee Loan / Advance

Create:

Loan for one employee
Installment due in payroll month
Approved installment

Validation must confirm deduction appears in payroll.

15. Payroll Run

Create payroll period and payroll run for seeded month.

Flow:

Create payroll period
Generate payroll run
Calculate payroll
Review exceptions
Approve payroll
Lock payroll

Validation must confirm:

gross salary calculated
deductions applied
loan recovery applied
overtime applied
net salary generated
snapshots frozen
16. WPS Cycle

Seed WPS configuration.

Generate WPS batch from approved payroll run.

Flow:

Generate WPS batch
Validate compliance
Review batch
Approve batch
Export SIF

Validation must confirm:

SIF file generated
total employees match valid WPS employees
total amount matches payroll net salary for included employees
invalid employee blocked/warned correctly
batch cannot export before approval
17. Final Settlement / EOS Cycle

Use one employee marked for separation.

Flow:

Create separation
Submit separation
Approve separation
Generate final settlement
Calculate EOS
Calculate leave encashment
Apply loan recovery / deductions
Approve settlement
Lock settlement

Validation must confirm:

EOS line generated
leave encashment generated
recoveries deducted
net settlement calculated
locked settlement immutable
18. Payroll Finance Posting

Seed payroll account configuration using company-owned COA accounts.

Ensure accounts exist:

Salary Expense
Housing Expense
Transport Expense
Allowance Expense
Overtime Expense
Payroll Payable
Loan Recovery
EOS Expense
EOS Provision
Leave Encashment
Salary Clearing

Post:

Payroll run
Final settlement
Optional WPS clearing

Validation must confirm:

accounts_trans balanced
company_id correct
employee ledger created
payroll reconciliation clean
19. Payroll Documents

Generate:

Payslips
Payroll Register Export
Salary Certificate
Settlement Statement
Employee Ledger Statement
WPS Register Export

Validation must confirm:

payslip uses frozen snapshot
PDF generated
IBAN masked
old payslip unchanged after employee salary update
exports generated successfully
Part B — Validation Script

Create:

validate-payroll-full-cycle.js

It should run checks and print a clear result summary.

Output format:

Payroll Full Cycle Validation

Company setup: PASS
Payroll masters: PASS
Employees: PASS
Salary structures: PASS
Leave balances: PASS
Attendance period: PASS
Payroll run: PASS
WPS batch: PASS
Final settlement: PASS
Finance posting: PASS
Payslip generation: PASS

Overall: PASS

If failure:

Overall: FAIL
Failed checks:
- WPS batch total does not match payroll net salary
- Payroll posting is not balanced
Validation Checks
Company Isolation

Confirm all seeded records have:

company_id = demo company id

and no records leak into another company.

Attendance Validation

Check:

attendance period exists
period is LOCKED
monthly summary created
payable days are correct
unpaid leave excluded
overtime captured
Payroll Calculation Validation

Check:

payroll run status = LOCKED
employee snapshots exist
component lines exist
gross > 0
net >= 0
loan deduction applied
overtime applied
adjustments applied
WPS Validation

Check:

WPS config exists
batch status = EXPORTED
SIF export exists
line count = eligible WPS employees
total amount = sum included net salary
invalid WPS employee handled correctly
Settlement Validation

Check:

separation approved
settlement locked
EOS line exists
leave encashment line exists
recoveries exist if applicable
net settlement calculated
Finance Posting Validation

Check:

payroll run posted
settlement posted
accounts_trans exists
total debits = total credits
company_id correct
payroll_run_id linked
payroll_settlement_id linked
employee ledger updated
reconciliation has no critical exception
Document Validation

Check:

payslips generated
payslips published if required
PDF path/document snapshot exists
payroll exports exist
settlement statement generated
salary certificate generated
Part C — Automated Test

Create Jest integration test:

backend/src/tests/payroll/full-cycle/payroll-full-cycle.test.js

Test should:

1. Setup demo company
2. Run seed function
3. Run validation function
4. Assert overall PASS

Add focused assertions:

Payroll run is locked
WPS batch exported
Settlement locked
GL posting balanced
Payslips generated from snapshot
Company isolation valid
Part D — Cleanup Script

Create optional cleanup:

cleanup-payroll-demo-data.js

Rules:

Only delete records tagged with demo_batch_code
Never delete live records
Require confirmation flag:
--confirm

All seeded records must include:

demo_batch_code = PAYROLL_FULL_CYCLE_DEMO_2026

If existing tables do not have this column, use metadata JSON if available.

If no metadata exists, use naming convention:

Payroll Demo
DEMO-
Part E — Documentation

Create:

Tasks/PayrollFullCycleDemo.md

Include:

Purpose
Seeded data overview
How to run
Expected result
Troubleshooting
Manual QA checklist
Known limitations

Commands:

cd backend
npm run seed:payroll-full-cycle
npm run validate:payroll-full-cycle
npm run test:payroll-full-cycle
Manual QA Checklist

After seeding, user should manually verify:

1. Open /people/payroll
2. Check employees and salary structures
3. Open attendance monthly summary
4. Confirm attendance period is locked
5. Open payroll runs
6. Confirm run is locked
7. Open payroll register
8. Open WPS batch and download SIF
9. Open final settlement
10. Open payroll finance dashboard
11. Verify GL posting
12. Open payslips and download PDF
13. Switch company and confirm no demo data leakage