Payroll Phase P5 — Leave Settlement & EOSB / Final Settlement Engine
Current Status

Completed:

P1 Payroll Foundation
P2 Attendance & Leave
P3 Payroll Calculation
P4 WPS & UAE Compliance

Available:

Employees
Salary Structures
Payroll Components
Payroll Runs
Leave Balances
Attendance Facts
Loans
Adjustments
WPS
Company Governance
Audit Framework
Objective

Build employee settlement and EOS engine:

Annual leave settlement
Leave encashment
EOSB calculation
Resignation settlement
Termination settlement
Notice recovery
Pending deductions
Loan recovery
Final settlement
Settlement approval workflow
Critical Rules

Do NOT implement:

Bank payment execution
Finance posting
Payslip PDF
Government API integrations

Do not modify:

Payroll calculation logic
WPS logic
Attendance logic

P5 consumes:

Approved employee data
Approved leave balances
Approved payroll data
Approved loans
UAE Compliance Rules

Support:

Unlimited contract
Limited contract
Resignation
Termination
Mutual separation
Retirement
Death

Support UAE Labour Law configurable rules.

Do NOT hardcode law values.

Create configurable rule structure.

Task 0 — Inspect Existing Payroll Structure

Inspect:

backend/src/models/payroll*
backend/src/services/payroll/*
backend/src/tests/payroll/*
frontend/src/pages/payroll/*

Search:

leave
salary
loan
employee
payroll_runs

Prepare note:

Salary component structure
Leave balance structure
Employee employment data
Existing payroll snapshots
Task 1 — EOS Configuration Master

Create:

payroll_eos_configurations

Fields:

id
company_id
rule_name
contract_type
minimum_service_months
gratuity_formula_type
daily_salary_basis
active
created_at
updated_at

Contract type:

LIMITED
UNLIMITED
ALL

Formula types:

FIXED
RULE_BASED
Task 2 — Employee Separation Entity

Create:

employee_separations

Fields:

id
company_id
employee_id
separation_type
last_working_day
notice_days
reason
status
created_by
approved_by
created_at
updated_at

Types:

RESIGNATION
TERMINATION
RETIREMENT
MUTUAL
DEATH

Status:

DRAFT
SUBMITTED
APPROVED
CANCELLED
Task 3 — Final Settlement Entity

Create:

payroll_final_settlements

Fields:

id
company_id
employee_id
separation_id
settlement_number
settlement_date
gross_settlement
deductions
net_settlement
status
created_by
approved_by
created_at
updated_at

Status:

DRAFT
CALCULATED
UNDER_REVIEW
APPROVED
LOCKED
CANCELLED
Task 4 — Settlement Component Lines

Create:

payroll_final_settlement_lines

Fields:

id
company_id
settlement_id
component_type
component_name
amount
calculation_source
remarks
created_at

Component types:

EOSB
LEAVE_ENCASHMENT
SALARY_PAYABLE
BONUS
LOAN_RECOVERY
NOTICE_RECOVERY
DEDUCTION
ADJUSTMENT
Task 5 — Annual Leave Settlement Engine

Create:

payrollLeaveSettlement.service.js

Methods:

calculateLeaveEncashment()

Rules:

Calculate:

unused leave balance
eligible leave balance
encashment days
daily salary
leave amount

Formula:

Leave Encashment
=
Daily Salary × Encashable Days

Daily Salary:

Monthly Salary ÷ 30

Use salary structure snapshot.

Task 6 — EOSB Calculation Engine

Create:

payrollEOS.service.js

Methods:

calculateEOS()

Inputs:

joining date
last working day
basic salary
contract type
separation type
EOS configuration

Rules:

Support configurable calculation.

Examples:

Years of service
Basic salary basis
Eligibility
Partial years

Do not hardcode UAE law.

Use configuration tables.

Task 7 — Notice Recovery Engine

Create:

payrollNoticeRecovery.service.js

Calculate:

required notice
served notice
shortfall
notice deduction

Formula:

Daily Salary
×
Notice Shortfall
Task 8 — Pending Recovery Engine

Create:

payrollSettlementRecovery.service.js

Include:

Outstanding loans
Payroll adjustments
Advance salary
Pending deductions

Rules:

Only approved balances.

Task 9 — Final Settlement Calculation Service

Create:

payrollFinalSettlement.service.js

Main:

generateFinalSettlement()

Process:

Step 1

Load:

employee
salary structure
leave balances
loan balances
pending payroll
separation
Step 2

Calculate:

EOSB
Leave encashment
Salary payable
Pending earnings
Recoveries
Step 3

Generate:

gross settlement
deductions
net settlement
Step 4

Freeze settlement snapshot.

Task 10 — Settlement Workflow

Endpoints:

POST /settlements/:id/calculate
POST /settlements/:id/approve
POST /settlements/:id/lock
POST /settlements/:id/cancel

Rules:

Only CALCULATED → APPROVED
Only APPROVED → LOCKED
Locked immutable
Task 11 — Settlement Dashboard

Create:

/people/payroll/final-settlement

Cards:

Pending settlements
EOS liabilities
Employees under separation
Settlement amount
Pending approvals

Exception panel:

Missing salary structure
Missing leave balances
Negative settlement
Outstanding loans
Task 12 — Settlement Reports

Add:

Final Settlement Register
EOS Liability Report
Leave Encashment Report
Separation Report
Settlement Variance Report
Task 13 — Audit Events

Add:

EMPLOYEE_SEPARATION_CREATED
FINAL_SETTLEMENT_GENERATED
FINAL_SETTLEMENT_APPROVED
FINAL_SETTLEMENT_LOCKED
EOS_CALCULATED
LEAVE_ENCASHMENT_CALCULATED
Task 14 — Permissions

Add:

payroll.settlement.view
payroll.settlement.manage
payroll.settlement.approve
Task 15 — Frontend

Create pages:

Separation Management
Final Settlements
EOS Configuration
EOS Dashboard
Settlement Register
Task 16 — Tests

Minimum:

40 backend tests

Examples:

Employee service years calculated correctly
EOS calculated correctly
Leave encashment correct
Loan recovery deducted
Notice recovery calculated
Settlement frozen
Locked settlement immutable
Cross-company blocked
Task 17 — Manual QA
1 Create employee
2 Create leave balance
3 Create loan
4 Create separation
5 Generate settlement
6 Verify EOS
7 Verify leave encashment
8 Verify recoveries
9 Approve settlement
10 Lock settlement
11 Switch company
12 Verify isolation