Payroll Phase P7 — Payslip, Payroll Documents & Reporting Layer
Current Status

Completed:

P1 Payroll Foundation
P2 Attendance & Leave
P3 Payroll Calculation
P4 WPS & UAE Compliance
P5 EOS & Final Settlement
P6 Payroll–Finance Integration

Available:

Employees
Payroll Runs
Salary structures
Attendance summaries
Payroll snapshots
WPS batches
Employee ledger
Final settlements
GL postings
Audit framework
Document templates
Company branding
Objective

Build:

Payslip engine
Settlement statements
Payroll documents
Payroll reports
Export framework
Document distribution
Critical Rules

Do NOT:

Modify payroll calculations
Modify finance posting
Modify WPS logic
Modify EOS logic
Create banking APIs

Consume only:

APPROVED / LOCKED payroll runs
APPROVED settlements
Employee ledger
WPS batches
Enterprise Principles

Documents must always use:

Frozen payroll snapshots

Never use:

Live employee master
Current salary structure
Current attendance

Otherwise:

June payslip could change in October

which is unacceptable.

Task 0 — Inspect Existing Document Framework

Inspect:

backend/src/services/document*
backend/src/services/report*
backend/src/services/payroll*
frontend/src/pages/payroll/*
printUtils
company_document_templates

Search:

pdf
print
template
report
export

Prepare internal note:

Existing PDF generation
Existing template engine
Existing report exports
Company branding support
Task 1 — Payroll Document Template Extension

Extend:

company_document_templates

Document types:

PAYSLIP
PAYROLL_REGISTER
FINAL_SETTLEMENT
EMPLOYEE_LEDGER
WPS_REGISTER
SALARY_CERTIFICATE
EOS_STATEMENT

Fields:

header_template
footer_template
logo
signature
stamp
watermark
show_company_address
show_company_trn
Task 2 — Payslip Entity

Create:

payroll_payslips

Fields:

id
company_id
payroll_run_employee_id
employee_id
payslip_number
payroll_period_id
gross_salary
deductions
net_salary
generated_at
generated_by
status
pdf_path
created_at
updated_at

Status:

DRAFT
GENERATED
PUBLISHED
VOID
Task 3 — Payslip Generation Service

Create:

payrollPayslip.service.js

Methods:

generatePayslip()
generateBatchPayslips()
publishPayslips()
voidPayslip()

Data source:

Frozen payroll snapshots only

Content:

Employee Information
Employee No
Employee Name
Department
Designation
Bank
IBAN masked
Payroll Period
Earnings
Basic
Housing
Transport
Allowances
Overtime
Bonus
Deductions
Loan Recovery
Penalty
Insurance
Adjustments
Summary
Gross Salary
Deductions
Net Salary
Task 4 — Salary Certificate Engine

Create:

payrollSalaryCertificate.service.js

Generate:

Salary certificate
Employment certificate
Bank salary letter
Visa salary letter

Fields:

Employee
Joining date
Designation
Current salary
Allowances
Total salary

Use template system.

Task 5 — Final Settlement Statement

Create:

payrollSettlementStatement.service.js

Generate:

EOS amount
Leave encashment
Recoveries
Final payable
Settlement summary

Use frozen settlement snapshot.

Task 6 — Employee Ledger Statement

Create:

employeeLedgerStatement.service.js

Generate:

Opening balance
Transactions
Recoveries
Salary
Settlement
Closing balance
Task 7 — Payroll Register Export Engine

Create:

payrollExport.service.js

Support:

PDF
Excel
CSV

Reports:

Payroll Register
Payroll Variance
WPS Register
Settlement Register
Employee Ledger
Attendance Summary
Loan Report
EOS Liability
Task 8 — Batch Document Generation

Endpoints:

POST /api/payroll/payslips/generate
POST /api/payroll/payslips/publish
POST /api/payroll/payslips/batch

Rules:

Only LOCKED payroll runs
Batch processing
Progress tracking
Task 9 — Payroll Distribution Layer

Create:

payrollDocumentDistribution.service.js

Support:

Email queue preparation
Document archive
Download package
ZIP generation

Do NOT send emails yet.

Prepare infrastructure only.

Task 10 — Payroll Dashboard Enhancement

Add:

/people/payroll/documents

Cards:

Generated payslips
Pending publication
Settlement documents
Salary certificates
Exports generated
Task 11 — Reports

Add:

Payslip Register
Salary Certificate Register
Settlement Register
Employee Payroll History
Payroll Trend Analysis
Payroll Cost Summary
Task 12 — Audit Events

Add:

PAYSLIP_GENERATED
PAYSLIP_PUBLISHED
PAYSLIP_VOIDED
SALARY_CERTIFICATE_GENERATED
SETTLEMENT_DOCUMENT_GENERATED
PAYROLL_EXPORT_GENERATED
Task 13 — Permissions

Add:

payroll.documents.view
payroll.documents.manage
payroll.documents.publish
Task 14 — Frontend

Create pages:

/people/payroll/payslips
/people/payroll/salary-certificates
/people/payroll/settlement-documents
/people/payroll/exports
Task 15 — Tests

Minimum:

50 backend tests

Examples:

Payslip generated from frozen snapshot
Employee salary changes do not alter old payslip
Settlement document immutable
Batch generation works
Export respects company scope
Cross-company blocked
Task 16 — Manual QA
1 Generate payroll run
2 Lock payroll
3 Generate payslip
4 Change employee salary
5 Regenerate payroll
6 Verify old payslip unchanged
7 Generate settlement statement
8 Generate salary certificate
9 Export payroll register
10 Switch company
11 Verify isolation