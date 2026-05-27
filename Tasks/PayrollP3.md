Payroll Phase P3 — Payroll Calculation Engine
Current Status

Completed:

P1 — Payroll Domain Foundation
P2 — Attendance, Leave & Timesheet Engine

Already available:

Employees
Salary structures
Payroll components
Leave policies
Attendance summaries
Overtime approvals
Attendance periods
Payroll readiness
Company isolation
Audit framework
Period controls
Finance infrastructure

P2 outputs:

approved attendance facts
approved overtime
approved leave
approved payable days

P3 consumes these outputs.

Objective

Build payroll calculation engine that generates:

Payroll runs
Payroll sheets
Earnings
Deductions
Employer contributions
Net salary
Payroll register
Calculation audit trail

without yet implementing:

WPS generation
EOSB calculation
Finance posting
Payslip PDF
Critical Rules

Do NOT implement:

WPS
EOSB
Finance posting
Salary payment posting
Bank transfer
Payslip PDF

Do not calculate directly from employee master.

Payroll must calculate from:

Locked attendance period
+
Salary structure snapshot
+
Payroll components
+
Approved additions/deductions
+
Approved overtime
Payroll Calculation Architecture

P3 must behave:

Attendance facts
    +
Salary definition
    +
Payroll rules
    +
Manual adjustments
    ↓
Calculation Engine
    ↓
Payroll Run
    ↓
Payroll Register
Task 0 — Inspect Existing Payroll Foundation

Inspect:

backend/src/models/payroll*
backend/src/services/payroll/*
backend/src/tests/payroll/*
frontend/src/pages/payroll/*

Find:

employee_salary_structures
payroll_components
attendance_periods
monthly_summary
overtime
leave
payable_days

Prepare implementation note:

1 Existing salary structures
2 Existing attendance facts
3 Existing payroll components
4 Existing approval patterns

Do not duplicate models.

Task 1 — Payroll Period Entity

Create:

payroll_periods

Fields:

id
company_id
period_month
period_year
from_date
to_date
status
created_by
generated_at
approved_by
approved_at
locked_by
locked_at
created_at
updated_at

Status:

OPEN
GENERATED
UNDER_REVIEW
APPROVED
LOCKED

Rules:

One payroll period per company/month/year
Attendance period must be APPROVED or LOCKED
Locked payroll period cannot change
Task 2 — Payroll Run Entity

Create:

payroll_runs

Fields:

id
company_id
payroll_period_id
run_number
run_type
status
total_employees
total_gross
total_deductions
total_net
created_by
approved_by
created_at
updated_at

Run types:

REGULAR
SUPPLEMENTARY
ADJUSTMENT
FINAL

Status:

DRAFT
CALCULATED
UNDER_REVIEW
APPROVED
LOCKED
REVERSED
Task 3 — Payroll Employee Snapshot

Create:

payroll_run_employees

Fields:

id
company_id
payroll_run_id
employee_id
salary_structure_snapshot
attendance_snapshot
payable_days
working_days
gross_salary
deductions
net_salary
status
created_at
updated_at

Purpose:

Freeze payroll facts.

If employee salary changes later:

old payroll must remain unchanged
Task 4 — Payroll Component Calculation Lines

Create:

payroll_run_component_lines

Fields:

id
company_id
payroll_run_employee_id
component_id
component_type
calculation_method
calculated_amount
base_amount
formula_snapshot
created_at

Component types:

EARNING
DEDUCTION
EMPLOYER
PROVISION
Task 5 — Monthly Adjustment Engine

Create:

payroll_monthly_adjustments

Fields:

id
company_id
employee_id
period_id
adjustment_type
component_id
amount
reason
status
approved_by
created_at
updated_at

Adjustment type:

ADDITION
DEDUCTION

Examples:

Bonus
Commission
Penalty
Recovery
Allowance
Manual adjustment

Rules:

Approved only
Period must be open
Task 6 — Loan / Advance Foundation

Create:

employee_loans
employee_loan_installments

Fields:

loan_amount
monthly_installment
balance
start_period
end_period
status

Status:

ACTIVE
CLOSED
HOLD

Rules:

Only approved installments participate in payroll

No finance posting yet.

Task 7 — Payroll Calculation Service

Create:

payrollCalculation.service.js

Main:

generatePayroll({
 companyId,
 payrollPeriodId
})

Process:

Step 1

Load:

employees
salary structures
attendance summary
overtime
adjustments
loans
Step 2

Calculate earnings:

Examples:

Basic
Housing
Transport
Food
Fixed allowance
Overtime
Bonus
Step 3

Calculate deductions:

Examples:

Loan recovery
Unpaid leave
Penalty
Insurance
Manual deduction
Step 4

Calculate:

gross_salary
total_deductions
net_salary

Formula:

Net Salary
=
Gross Salary
− Deductions
Step 5

Store snapshots.

Task 8 — Salary Proration Logic

For attendance impact:

Formula:

Payable Salary
=
Monthly Salary
×
(payable_days / working_days)

Rules:

Paid leave included
Unpaid leave excluded
Holiday included
Weekoff follows leave policy

Do not calculate EOSB.

Task 9 — Overtime Calculation

Use approved overtime:

Rules:

Support:

Fixed overtime
Multiplier
Hourly

Formula example:

Hourly Rate
=
Basic Salary
÷ 30
÷ Working Hours

Overtime
=
Hourly Rate
× Hours
× Multiplier

Multiplier from payroll component.

Task 10 — Payroll Approval Workflow

Endpoints:

POST /payroll/runs/:id/calculate
POST /payroll/runs/:id/approve
POST /payroll/runs/:id/lock
POST /payroll/runs/:id/reverse

Rules:

Only CALCULATED → APPROVED
Only APPROVED → LOCKED
Locked run immutable
Task 11 — Payroll Review Dashboard

Create:

/people/payroll/calculation

Cards:

Employees processed
Gross salary
Total deductions
Net salary
Exceptions
Pending reviews

Exception panel:

Missing attendance
Missing salary structure
Negative salary
Missing components
Loan mismatch
Task 12 — Payroll Register

Create:

GET /payroll/register

Columns:

Employee
Basic
Allowances
Overtime
Gross
Deductions
Net
Status

Company-scoped.

Task 13 — Payroll Variance

Create:

GET /payroll/variance

Compare:

Current period
vs
Previous period

Show:

salary increase
decrease
reason
Task 14 — Audit Events

Add:

PAYROLL_RUN_CREATED
PAYROLL_CALCULATED
PAYROLL_APPROVED
PAYROLL_LOCKED
PAYROLL_REVERSED
PAYROLL_ADJUSTMENT_APPROVED
Task 15 — Permissions

Add:

payroll.processing.view
payroll.processing.manage
payroll.processing.approve
Task 16 — Frontend

Add pages:

Payroll Runs
Adjustments
Loans
Payroll Register
Payroll Variance
Payroll Review Dashboard
Task 17 — Tests

Minimum:

40 backend tests

Examples:

Salary prorated correctly
Paid leave included
Unpaid leave excluded
Overtime calculated
Adjustment applied
Loan deduction applied
Payroll snapshot frozen
Locked payroll immutable
Cross-company access blocked
Task 18 — Manual QA
1 Create Company A/B
2 Create employees
3 Configure salary structure
4 Generate attendance
5 Approve attendance
6 Generate payroll
7 Review payroll
8 Approve payroll
9 Lock payroll
10 Modify employee salary
11 Verify old payroll unchanged
12 Switch company
13 Verify isolation