Payroll Phase P4 — WPS & UAE Payroll Compliance Engine
Current Status

Completed:

P1 Payroll Foundation
P2 Attendance & Leave Engine
P3 Payroll Calculation Engine

Already available:

Employees
Salary Structures
Payroll Components
Payroll Periods
Payroll Runs
Frozen Payroll Snapshots
Loans
Adjustments
Register
Company Governance
Audit Framework

P3 output:

Approved payroll run
Employee net salary
Payroll register

P4 consumes approved payroll.

Objective

Build UAE payroll compliance engine:

WPS configuration
SIF generation
Payroll compliance validation
Salary file workflow
WPS audit
WPS exception handling
Bank validation
GPSSA foundation
Emiratisation monitoring
Critical Rules

Do NOT implement:

EOSB calculations
Finance posting
Payslip PDF
Salary bank integration APIs
Actual bank payment execution

Do not change payroll calculations.

P4 consumes:

APPROVED payroll runs only
Task 0 — Inspect Existing Payroll System

Inspect:

backend/src/models/payroll*
backend/src/services/payroll*
backend/src/controllers/payroll*
frontend/src/pages/payroll/*

Search:

payroll_runs
net_salary
employee_bank_details
visa_sponsor
employees
salary_structure

Prepare internal note:

Existing employee bank details
Payroll run structure
Payroll snapshot model
Company settings
Existing export mechanisms
Task 1 — WPS Configuration Master

Create:

payroll_wps_configurations

Fields:

id
company_id
visa_sponsor_company_id
agent_name
agent_code
mol_establishment_id
mol_company_code
payer_bank_name
payer_bank_account
payer_bank_iban
salary_currency
default_salary_type
status
created_at
updated_at

Status:

ACTIVE
INACTIVE

Rules:

One active WPS configuration per company + sponsor company
Task 2 — Employee WPS Information

Extend employee bank details:

Add:

iban
bank_name
bank_code
salary_card_no
labour_card_no
mol_personal_id
wps_enabled
payment_method

Payment methods:

BANK_TRANSFER
SALARY_CARD
CASH
CHEQUE

Rules:

IBAN validation mandatory for bank transfer
Labour card mandatory for WPS employees
Task 3 — WPS Batch Entity

Create:

payroll_wps_batches

Fields:

id
company_id
payroll_run_id
batch_number
salary_month
salary_year
total_employees
total_amount
status
generated_by
approved_by
created_at
updated_at

Status:

DRAFT
GENERATED
UNDER_REVIEW
APPROVED
EXPORTED
CANCELLED
Task 4 — WPS Employee Lines

Create:

payroll_wps_employee_lines

Fields:

id
company_id
batch_id
employee_id
employee_no
employee_name
labour_card_no
iban
salary_amount
salary_type
remarks
validation_status
created_at

Validation status:

VALID
WARNING
ERROR
Task 5 — Compliance Validation Engine

Create:

payrollCompliance.service.js

Main:

validatePayrollCompliance()

Checks:

Employee checks
Missing IBAN
Missing labour card
Missing MOL ID
Inactive employee
Expired visa
Expired Emirates ID
Expired passport
Missing salary structure
Payroll checks
Negative salary
Net salary zero
Duplicate employee in payroll
Unapproved payroll run
Company checks
Missing WPS config
Missing MOL establishment
Missing sponsor

Return:

{
 "severity":"ERROR",
 "employee":"EMP001",
 "message":"Missing IBAN"
}
Task 6 — WPS Batch Generation

Create endpoint:

POST /api/payroll/wps/generate

Payload:

{
 "payroll_run_id": 10
}

Rules:

Payroll run must be APPROVED
Run validations first
Create WPS batch
Populate employee lines
Block generation if ERROR exists
Allow WARNING
Task 7 — SIF File Generator

Create:

payrollSIFGenerator.service.js

Generate UAE compliant:

SIF TXT

Structure:

Header:

Record Type
Employer ID
Company Name
Salary Month
Employee Count
Total Salary

Details:

Employee MOL ID
Employee Name
Bank
IBAN
Salary Amount

Trailer:

Total Count
Total Amount

Rules:

Only VALID/WARNING employees included
Task 8 — WPS Workflow

Endpoints:

POST /wps/:id/review
POST /wps/:id/approve
POST /wps/:id/export
POST /wps/:id/cancel

Workflow:

DRAFT
→ GENERATED
→ UNDER_REVIEW
→ APPROVED
→ EXPORTED

Rules:

Export only after APPROVED
Export locks batch
Locked batch immutable
Task 9 — GPSSA Foundation

Create:

payroll_gpssa_configuration

Fields:

company_id
employee_rate
employer_rate
government_rate
active

Employee fields:

gpssa_eligible
uae_national

Do not calculate yet.

Only foundation.

Task 10 — Emiratisation Monitoring

Create service:

emiratisation.service.js

Metrics:

Total employees
UAE nationals
Required %
Actual %
Gap

Endpoint:

GET /api/payroll/emiratisation
Task 11 — WPS Dashboard

Create:

/people/payroll/wps

Cards:

Pending WPS batches
Validation issues
Employees with errors
Total salary amount
Exported batches
Emiratisation %

Exception panel:

Missing IBAN
Expired visa
Missing labour card
Missing WPS config
Task 12 — Reports

Add:

WPS Register
SIF Export History
Compliance Exception Report
Employee Bank Validation Report
Emiratisation Report
GPSSA Eligibility Report
Task 13 — Audit Events

Add:

WPS_BATCH_GENERATED
WPS_BATCH_APPROVED
WPS_BATCH_EXPORTED
WPS_VALIDATION_FAILED
COMPLIANCE_EXCEPTION_FOUND
Task 14 — Permissions

Add:

payroll.wps.view
payroll.wps.manage
payroll.wps.approve
Task 15 — Frontend

Add pages:

WPS Dashboard
WPS Batches
Compliance Exceptions
Emiratisation
GPSSA Setup
Task 16 — Tests

Minimum:

40 backend tests

Examples:

Payroll run required before WPS
Missing IBAN blocks employee
Missing MOL ID blocks employee
Expired visa generates warning/error
SIF generated correctly
Export locks batch
Cross-company access blocked
Task 17 — Manual QA
1 Create payroll run
2 Approve payroll
3 Configure WPS
4 Create employee bank details
5 Add labour cards
6 Generate WPS batch
7 Review validation errors
8 Approve batch
9 Export SIF
10 Verify totals
11 Switch company
12 Verify isolation