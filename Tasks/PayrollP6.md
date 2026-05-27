Payroll Phase P6 — Payroll Finance Posting & Employee Ledger
Current Status

Completed:

P1 Payroll Foundation
P2 Attendance/Leave Engine
P3 Payroll Calculation Engine
P4 WPS Compliance
P5 EOS & Final Settlement

Existing finance foundation:

Multi-company posting engine
AccountsTrans
companyAccountingEntry.service
Financial periods
VAT periods
Document numbering
Audit framework
Company governance

Payroll P6 must consume:

Approved Payroll Runs
Approved Final Settlements
Approved Loan Recoveries
Approved WPS batches
Objective

Implement:

Payroll accounting posting
Employee ledger
Payroll liabilities
Settlement liabilities
GL reconciliation
Posting reversal
Critical Rules

Do NOT:

Create a separate accounting engine
Duplicate AccountsTrans
Duplicate GL logic
Rewrite posting services
Modify finance calculations

Reuse:

companyAccountingEntry.service.js
financePostingContext.service.js
periodValidationService.js
companyScope.js
Task 0 — Inspect Existing Finance Architecture

Inspect:

backend/src/services/finance*
backend/src/services/companyAccountingEntry*
backend/src/models/accounts*
backend/src/controllers/payment*
backend/src/controllers/journal*
backend/src/controllers/invoice*

Search:

AccountsTrans.create
companyAccountingEntry
post
reverse
ledger

Prepare internal note:

Existing posting pattern
Existing source_type usage
Existing reversals
Existing payable flow
Existing financial controls
Task 1 — Payroll Accounting Configuration

Create:

payroll_account_configurations

Fields:

id
company_id
basic_salary_expense_account
housing_expense_account
transport_expense_account
allowance_expense_account
overtime_expense_account
payroll_payable_account
loan_recovery_account
eos_expense_account
eos_provision_account
leave_encashment_account
staff_cost_center_id
active
created_at
updated_at

Rules:

One active configuration per company
Accounts must belong to company
Task 2 — Employee Ledger Foundation

Create:

employee_ledger_headers
employee_ledger_lines

Header:

id
company_id
employee_id
ledger_no
status
created_at
updated_at

Lines:

id
company_id
ledger_header_id
transaction_date
source_type
source_id
reference_no
description
debit
credit
balance
created_at

Source types:

PAYROLL
LOAN
ADVANCE
EOS
SETTLEMENT
ADJUSTMENT
PAYMENT
RECOVERY

Purpose:

Employee financial history
Task 3 — Payroll Posting Service

Create:

payrollFinancePosting.service.js

Methods:

postPayrollRun()

reversePayrollRun()

postSettlement()

reverseSettlement()
Task 4 — Payroll Run GL Posting

On approved payroll:

Example:

Basic Salary         20,000
Housing               5,000
Transport              500
Loan Recovery          500
Net Salary           25,000

Posting:

Dr Salary Expense            20,000
Dr Housing Expense            5,000
Dr Transport Expense            500

Cr Payroll Payable          25,500
Cr Loan Recovery               500

Use:

companyAccountingEntry.service

Accounting lines:

company_id=req.companyId
source_type=PAYROLL_RUN
source_id=runId
Task 5 — Loan Recovery Posting

On payroll:

Example:

Loan Recovery: 1000

Posting:

Dr Payroll Payable       1000
Cr Employee Loan Account 1000

Rules:

Approved installment only
Task 6 — EOS Provision Posting

For EOS accrual:

Example:

Dr EOS Expense
Cr EOS Provision

Rules:

Use configuration account
Monthly accrual optional
Company setting driven

Do not force accrual.

Task 7 — Final Settlement Posting

Settlement example:

EOS              10000
Leave Salary      3000
Recoveries        1000
Net Settlement   12000

Posting:

Dr EOS Expense             10000
Dr Leave Encashment         3000
Cr Loan Recovery            1000
Cr Settlement Payable      12000
Task 8 — WPS Clearing Integration

When WPS batch exported:

Create optional liability clearing:

Dr Payroll Payable
Cr Salary Clearing Account

Do not execute bank payment.

Only accounting.

Task 9 — Employee Ledger Integration

Automatically create ledger lines for:

Payroll
Loan
Recovery
Settlement
EOS
Advance
Adjustment
Payment

Example:

01-Jun Payroll Generated
Credit 25000

03-Jun Loan Recovery
Debit 1000

30-Jun Salary Paid
Debit 24000
Task 10 — Posting Reversal

Rules:

Allowed:

APPROVED payroll
APPROVED settlement

Blocked:

LOCKED period
Closed finance period
Already reconciled

Reverse entries:

Debit ↔ Credit

Audit:

PAYROLL_POSTING_REVERSED
Task 11 — Payroll Reconciliation Dashboard

Create:

/people/payroll/finance

Cards:

Payroll payable balance
Employee liabilities
EOS liabilities
Loan balances
Unposted payroll runs
Reconciliation issues

Exception panel:

Missing account configuration
Unbalanced entries
Ledger mismatch
Unposted settlements
Task 12 — APIs

Create:

POST /api/payroll/post/run/:id
POST /api/payroll/post/run/:id/reverse

POST /api/payroll/post/settlement/:id
POST /api/payroll/post/settlement/:id/reverse

GET /api/payroll/employee-ledger
GET /api/payroll/reconciliation
GET /api/payroll/account-config
Task 13 — Reports

Add:

Payroll Posting Register
Employee Ledger
Payroll Liability Report
EOS Provision Report
Loan Recovery Report
Payroll GL Reconciliation
Task 14 — Permissions

Add:

payroll.finance.view
payroll.finance.manage
payroll.finance.approve
Task 15 — Audit Events

Add:

PAYROLL_POSTED
PAYROLL_POSTING_REVERSED
SETTLEMENT_POSTED
SETTLEMENT_REVERSED
EMPLOYEE_LEDGER_UPDATED
PAYROLL_RECONCILIATION_EXCEPTION
Task 16 — Frontend

Create pages:

Payroll Finance
Employee Ledger
Payroll Posting Register
Payroll Reconciliation
Account Configuration
Task 17 — Tests

Minimum:

45 backend tests

Examples:

Payroll creates balanced entries
Settlement creates balanced entries
Loan recovery posted correctly
Reversal creates inverse entries
Cross-company blocked
Closed period blocked
Employee ledger updates
Reconciliation detects mismatch
Task 18 — Manual QA
1 Create payroll run
2 Approve payroll
3 Configure payroll accounts
4 Post payroll
5 Verify GL entries
6 Verify employee ledger
7 Create settlement
8 Post settlement
9 Reverse payroll
10 Verify reverse entries
11 Switch company
12 Verify isolation