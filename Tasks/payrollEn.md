Payroll UI/UX Enterprise Enhancement — UAE Real Estate Payroll Management
Problem

Payroll backend P1–P7 is implemented, but the frontend pages are too basic. Many screens only show simple lists, limited forms, no enterprise workflow, poor detail views, and weak operational guidance.

Current issue examples:

Employee detail only shows employee no/name/joining date
Employee list lacks filters, actions, documents, salary, WPS, payroll status
Final settlement page shows basic values only
Salary structures page lacks component detail and approval flow
Leave policies/components pages are simple tables
Leave application page has no workflow/action controls
Objective

Upgrade the complete Payroll Management frontend into an advanced enterprise-grade UAE Real Estate payroll system.

Do not rewrite backend engines unless required. Reuse existing APIs wherever possible. Add missing API endpoints only when frontend needs aggregated/detail data.

Core UI Principle

Every payroll screen must become:

Operational
Workflow-driven
Exception-first
Audit-aware
Company-aware
Role-aware
UAE-compliance-aware

Avoid simple CRUD pages.

Phase UX-1 — Payroll Command Center

Create/upgrade:

/people/payroll

Build a Payroll Command Center with cards:

Employees Active
Payroll Period Status
Attendance Readiness
Pending Leave Approvals
Pending Timesheets
Payroll Runs Pending Approval
WPS Batches Pending Export
Final Settlements Pending Approval
Payroll Finance Posting Status
Document Expiry Alerts

Add action queue:

Approve leave
Lock attendance
Calculate payroll
Approve payroll
Generate WPS
Post payroll to GL
Generate payslips
Review settlement
Phase UX-2 — Employee 360 Profile

Upgrade employee detail page from basic form to full Employee 360.

Tabs:

Overview
Employment
Salary Structure
Attendance & Leave
Payroll History
Loans & Adjustments
Documents
WPS & Bank
EOS / Settlement
Ledger
Audit Trail

Overview must show:

Employee no
Name
Status
Photo placeholder
Department
Designation
Workforce group
Visa sponsor
Branch
Cost center
Joining date
Contract type
Payroll group
WPS status
Document expiry warning
Current salary total
Last payroll net salary

Add actions:

Edit employee
Update salary
Promote/transfer
Upload document
Create leave
Create adjustment
Create loan
Generate salary certificate
View ledger
Phase UX-3 — Employee List Enhancement

Upgrade employee list with:

Search
Department filter
Designation filter
Workforce filter
Status filter
Visa sponsor filter
Document expiry filter
WPS readiness filter
Payroll group filter

Columns:

Employee No
Name
Department
Designation
Workforce
Payroll Group
WPS
Document Risk
Status
Current Salary
Actions

Actions:

View
Edit
Salary
Documents
Payroll History
Ledger
Phase UX-4 — Salary Structure Advanced UI

Upgrade salary structure page.

Required:

Employee filter
Effective date
Active/inactive versioning
Component grid
Total earnings
Total deductions
Total gross
EOS affecting components
WPS affecting components

Line editor:

Component
Type
Amount
Calculation method
EOS applicable
WPS applicable
Effective from
Effective to

Add actions:

Create new revision
Approve salary structure
Clone from previous
View salary history
Phase UX-5 — Leave Management Advanced UI

Upgrade leave pages.

Leave dashboard:

Leave balances
Pending approvals
Employees on leave today
Upcoming leaves
Negative balance warnings
Leave calendar

Leave application page must include:

Apply leave
Submit
Approve
Reject
Cancel
Balance preview
Overlap warning
Payroll period lock warning

Leave balance page:

Opening
Used
Adjusted
Available
Pending approval
Encashable
Phase UX-6 — Attendance & Timesheet Control Center

Create/upgrade:

/people/payroll/attendance-control

Sections:

Attendance period status
Staff auto-generation
Labour timesheet approval
Missing attendance
Overtime approvals
Monthly summary
Payroll readiness

Add exception-first table:

Employee
Issue
Date
Severity
Action

Examples:

Missing attendance
Pending leave approval
Unapproved overtime
Unapproved labour timesheet
Period not locked
Phase UX-7 — Payroll Calculation Workspace

Upgrade payroll calculation pages.

Payroll run detail should show:

Run status
Period
Employee count
Gross
Deductions
Net
Exceptions
Approval timeline

Tabs:

Employees
Component Breakdown
Exceptions
Variance
Audit

Employee payroll line detail:

Attendance snapshot
Salary snapshot
Earnings
Deductions
Loans
Adjustments
Net salary

Actions:

Calculate
Recalculate draft
Submit review
Approve
Lock
Reverse
Phase UX-8 — WPS & UAE Compliance Workspace

Upgrade WPS module.

WPS batch detail tabs:

Summary
Employees
Validation Issues
SIF Export
Audit

Show:

Valid employees
Warning employees
Blocked employees
Total salary
MOL/company details
IBAN validation
Labour card validation

Actions:

Validate
Generate batch
Review
Approve
Export SIF
Download SIF

Compliance dashboard:

Missing IBAN
Missing MOL ID
Expired visa
Expired Emirates ID
Expired passport
Non-WPS employees
UAE national / GPSSA indicators
Phase UX-9 — Final Settlement Advanced UI

Upgrade final settlement screen.

Settlement detail must show:

Employee details
Separation details
Service period
Basic salary
EOS calculation
Leave encashment
Salary payable
Loans/recoveries
Notice recovery
Net settlement
Approval status

Tabs:

Calculation
Lines
Recoveries
Documents
Audit

Actions:

Calculate
Approve
Lock
Cancel
Generate settlement statement
Post to finance if P6 enabled

Show calculation explanation, not just final amount.

Phase UX-10 — Payroll Finance Workspace

Upgrade payroll finance pages.

Dashboard cards:

Unposted payroll runs
Payroll payable
EOS liabilities
Employee ledger balance
Reconciliation exceptions
WPS clearing pending

Posting register columns:

Source
Period
Amount
Status
Posted Date
GL Reference
Actions

Employee ledger page:

Employee filter
Date range
Source type
Debit
Credit
Balance
Export
Phase UX-11 — Payroll Documents Hub

Upgrade documents hub.

Sections:

Payslip batches
Published payslips
Salary certificates
Settlement statements
Employee ledger statements
Exports
Distribution queue

Actions:

Generate payslips
Publish payslips
Download PDF
Generate salary certificate
Generate ZIP
Export payroll register
Phase UX-12 — Reports & Analytics

Create Payroll Reports Center:

Payroll Register
Payroll Variance
Attendance Summary
Leave Balance
WPS Register
EOS Liability
Employee Ledger
Document Expiry
Payroll Cost by Property/Cost Centre
Payroll Cost by Department
Payroll Cost by Workforce

All reports must support:

Company
Period
Department
Cost centre
Workforce
Employee
Export PDF/Excel/CSV
Phase UX-13 — Real Estate Specific Enhancements

Because this is Real Estate payroll, add cost visibility by:

Property
Building
Unit cluster
Cost center
Maintenance team
Department
Branch

Where employee has no direct property, use cost center allocation.

Add reports:

Payroll Cost by Property
Maintenance Labour Cost
Staff Cost by Building
Technician Cost Allocation
Payroll vs Rental Income optional placeholder
Phase UX-14 — Common UX Standards

Apply across all payroll pages:

Consistent page header
Breadcrumb
Search/filter panel
Status badges
Action buttons
Empty states
Loading skeleton
Error state
Confirmation dialogs
Pagination
Export buttons
Audit drawer

Use existing design system:

shadcn/ui
Tailwind
TanStack Query
Existing permission guards
Existing company context
Phase UX-15 — Backend API Gaps

Only add backend endpoints if required for enterprise UI.

Possible endpoints:

GET /api/payroll/employees/:id/360
GET /api/payroll/dashboard/command-center
GET /api/payroll/attendance/exceptions
GET /api/payroll/runs/:id/detail
GET /api/payroll/wps/:id/detail
GET /api/payroll/settlements/:id/detail
GET /api/payroll/reports/cost-allocation
GET /api/payroll/audit/:entityType/:entityId

Do not duplicate existing endpoints.

Phase UX-16 — Testing

Add frontend tests where project supports:

Employee 360 renders tabs
Payroll command center loads KPIs
Leave approval actions work
Payroll run detail shows component breakdown
WPS validation issues render
Settlement calculation details render
Company switch clears payroll data
Permission guard hides restricted actions

Backend tests for new aggregate endpoints:

Employee 360 company-scoped
Command center KPIs company-scoped
Cost allocation report company-scoped
Audit endpoint company-scoped
Manual QA Checklist

Test:

1. Open Payroll Command Center
2. Review action queue
3. Open employee 360
4. Verify salary, documents, WPS, payroll history
5. Open leave dashboard and approve/reject leave
6. Open attendance control and verify exceptions
7. Open payroll run detail and review employee breakdown
8. Open WPS batch and validation issues
9. Open final settlement and verify calculation explanation
10. Open payroll finance dashboard
11. Generate/download payslip
12. Switch company and confirm no data leakage
13. Test role restrictions