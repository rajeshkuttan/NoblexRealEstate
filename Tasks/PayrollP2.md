Payroll Phase P2 — Attendance, Leave & Timesheet Engine
Current Status

Payroll P1 is complete.

Already implemented:

Payroll organization masters
Employee master
Salary structure foundation
Leave type/policy foundation
Shift / holiday / work calendar foundation
Payroll components
Employee documents
Company-wise isolation
Payroll RBAC
Payroll audit
/payroll APIs
/people/payroll frontend hub
Objective

Implement the operational engine that converts employee availability, leave, attendance and labour timesheets into approved payroll inputs.

P2 must produce:

Approved attendance days
Approved leave days
Approved unpaid leave days
Approved overtime hours
Approved labour timesheet hours
Monthly attendance summary

These outputs will be consumed later by:

P3 Payroll Calculation Engine
Critical Rule

Do not implement salary calculation in P2.

Do not implement:

payroll run
net salary
WPS
EOSB
payslip
finance posting
salary expense posting
formula engine

Only implement:

Attendance
Leave
Timesheet
Overtime
Monthly attendance approval
Enterprise Design Principle

P2 is not CRUD.

It is a controlled engine:

Employee calendar
+ shift rules
+ holiday rules
+ leave rules
+ attendance logs
+ timesheets
+ approvals
= payroll-ready attendance facts
Task 0 — Inspect Existing Payroll Foundation

Inspect:

backend/src/models/payrollModels.js
backend/src/routes/payroll*
backend/src/controllers/payroll*
backend/src/services/payroll*
backend/src/tests/payroll
frontend/src/pages/payroll
frontend/src/services/api.ts

Confirm existing tables/entities:

employees
leave_types
leave_policies
leave_policy_assignments
shift_masters
holiday_calendars
work_calendars
payroll_groups
departments
cost_centers

Do not duplicate P1 models.

Task 1 — Create Leave Opening Balance Engine

Create table/model:

payroll_leave_opening_balances

Fields:

id
company_id
employee_id
leave_type_id
balance_year
opening_days
used_days
adjusted_days
available_days
status
created_by
approved_by
approved_at
created_at
updated_at

Status:

DRAFT
APPROVED
LOCKED

Rules:

One opening balance per employee + leave type + year + company
Employee must belong to active company
Leave type must belong to active company
Approved balance becomes available for leave application
Locked balance cannot be edited
Task 2 — Leave Application Engine

Create table/model:

payroll_leave_applications

Fields:

id
company_id
employee_id
leave_type_id
from_date
to_date
total_days
half_day
reason
status
approval_level
approved_by
approved_at
rejected_by
rejected_at
rejection_reason
cancelled_by
cancelled_at
created_at
updated_at

Status:

DRAFT
SUBMITTED
APPROVED
REJECTED
CANCELLED

Rules:

Cannot apply leave before joining date
Cannot apply leave for inactive employee
Cannot overlap approved/submitted leave
Cannot exceed available balance unless leave type allows negative balance
Unpaid leave allowed if leave type is configured as unpaid
Approved leave reduces available balance
Cancelled approved leave restores balance

Do not calculate salary impact yet.

Only classify:

PAID_LEAVE
UNPAID_LEAVE
Task 3 — Leave Approval Workflow

Implement approval endpoints:

POST /api/payroll/leave-applications/:id/submit
POST /api/payroll/leave-applications/:id/approve
POST /api/payroll/leave-applications/:id/reject
POST /api/payroll/leave-applications/:id/cancel

Rules:

Only submitted leave can be approved/rejected
Only draft leave can be submitted
Approved leave cannot be edited
Cancelled leave cannot be posted to attendance
All actions audited

Audit:

LEAVE_APPLICATION_SUBMITTED
LEAVE_APPLICATION_APPROVED
LEAVE_APPLICATION_REJECTED
LEAVE_APPLICATION_CANCELLED
Task 4 — Attendance Raw Log Foundation

Create table/model:

payroll_attendance_logs

Fields:

id
company_id
employee_id
attendance_date
check_in_time
check_out_time
source
device_id
location
raw_payload
status
created_at
updated_at

Source:

MANUAL
IMPORT
BIOMETRIC
SYSTEM

Status:

RAW
VALIDATED
ERROR
IGNORED

Rules:

Employee must belong to active company
Multiple raw logs allowed per day
Raw logs are not payroll-ready
Task 5 — Attendance Daily Summary Engine

Create table/model:

payroll_attendance_daily_summaries

Fields:

id
company_id
employee_id
attendance_date
shift_id
work_calendar_id
scheduled_hours
actual_hours
late_minutes
early_leave_minutes
overtime_hours
absence_type
attendance_status
source
is_manual_adjustment
approved_by
approved_at
locked
created_at
updated_at

attendance_status:

PRESENT
ABSENT
ON_LEAVE
HOLIDAY
WEEK_OFF
HALF_DAY
UNPAID_LEAVE
MISSING_PUNCH

Rules:

One daily summary per employee per date per company
Generated from raw logs + shift + calendar + approved leave
Manual adjustment allowed before monthly lock
Locked summary cannot be edited
Task 6 — Staff Auto-Timesheet Generation

For workforce group:

Staff
Management
Admin

Generate attendance summary automatically based on:

Work calendar
Holidays
Approved leave
Joining date
Employee active status

Logic:

If approved paid leave → ON_LEAVE
If approved unpaid leave → UNPAID_LEAVE
If holiday → HOLIDAY
If week off → WEEK_OFF
Else → PRESENT

No salary calculation.

Only attendance facts.

Endpoint:

POST /api/payroll/attendance/generate-staff

Payload:

{
  "from_date": "2026-06-01",
  "to_date": "2026-06-30",
  "employee_ids": []
}
Task 7 — Labour Timesheet Engine

Create table/model:

payroll_labour_timesheets

Header fields:

id
company_id
timesheet_month
timesheet_year
department_id
cost_center_id
status
created_by
approved_by
approved_at
locked_at
created_at
updated_at

Status:

DRAFT
SUBMITTED
APPROVED
LOCKED
REJECTED

Create line table:

payroll_labour_timesheet_lines

Fields:

id
timesheet_id
company_id
employee_id
work_date
normal_hours
overtime_hours
holiday_hours
absence_hours
remarks
created_at
updated_at

Rules:

Only Labour/Technical workforce employees allowed
Employee must belong to active company
Timesheet lines cannot overlap locked daily summaries
Approved labour timesheet updates attendance daily summaries
Locked timesheet cannot be edited
Task 8 — Overtime Approval Engine

Create table/model:

payroll_overtime_requests

Fields:

id
company_id
employee_id
work_date
requested_hours
approved_hours
reason
status
approved_by
approved_at
created_at
updated_at

Status:

DRAFT
SUBMITTED
APPROVED
REJECTED
CANCELLED

Rules:

Employee must be overtime eligible
Overtime cannot be approved on absent day unless holiday/weekoff work is allowed
Approved overtime updates daily summary overtime_hours
No payroll amount calculation yet
Task 9 — Monthly Attendance Period

Create table/model:

payroll_attendance_periods

Fields:

id
company_id
period_month
period_year
from_date
to_date
status
generated_by
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

One attendance period per company + month + year
Locked attendance period cannot be changed
Payroll P3 can consume only APPROVED or LOCKED period

Endpoints:

POST /api/payroll/attendance-periods/generate
POST /api/payroll/attendance-periods/:id/approve
POST /api/payroll/attendance-periods/:id/lock
Task 10 — Monthly Attendance Summary

Create API:

GET /api/payroll/attendance/monthly-summary

Filters:

month
year
department_id
cost_center_id
employee_id
workforce_group_id

Return:

employee
calendar_days
working_days
present_days
paid_leave_days
unpaid_leave_days
absent_days
holiday_days
week_off_days
overtime_hours
late_minutes
early_leave_minutes
payable_days

Important:

payable_days is factual only.
Do not calculate salary.
Task 11 — Payroll Readiness Snapshot

Create endpoint:

GET /api/payroll/attendance/payroll-readiness

Return:

period
total_employees
missing_attendance
pending_leave_approvals
pending_overtime_approvals
unapproved_timesheets
locked_status
ready_for_payroll
blocking_issues

This is important for P3.

Task 12 — Company Isolation

All P2 tables must include:

company_id

All APIs must use:

authMiddleware
resolveCompanyContext
payroll permission middleware

Rules:

Body company_id ignored
Employee must belong to active company
Department/cost center/shift/calendar must belong to active company
Company A attendance invisible in Company B
Task 13 — Period Lock Interaction

If payroll attendance period is:

LOCKED

Block:

leave approval affecting period
attendance adjustment
timesheet update
overtime approval
daily summary regeneration

Return:

{
  "message": "Attendance period is locked"
}
Task 14 — Audit Events

Add audit events:

LEAVE_OPENING_BALANCE_APPROVED
LEAVE_APPLICATION_SUBMITTED
LEAVE_APPLICATION_APPROVED
LEAVE_APPLICATION_REJECTED
LEAVE_APPLICATION_CANCELLED
ATTENDANCE_LOG_IMPORTED
ATTENDANCE_SUMMARY_GENERATED
ATTENDANCE_ADJUSTED
LABOUR_TIMESHEET_SUBMITTED
LABOUR_TIMESHEET_APPROVED
OVERTIME_APPROVED
ATTENDANCE_PERIOD_GENERATED
ATTENDANCE_PERIOD_APPROVED
ATTENDANCE_PERIOD_LOCKED
Task 15 — Frontend UI

Add under:

/people/payroll

Pages:

Leave Opening Balances
Leave Applications
Attendance Logs
Staff Auto Timesheet
Labour Timesheets
Overtime Requests
Attendance Periods
Monthly Attendance Summary
Payroll Readiness

UX focus:

Exception-first dashboard
Pending approvals
Missing attendance
Unapproved timesheets
Locked period status

Do not build a basic CRUD-only screen.

Task 16 — Payroll Control Dashboard

Add Payroll Operations dashboard:

Cards:

Pending leave approvals
Pending overtime approvals
Unapproved labour timesheets
Missing attendance records
Current attendance period status
Employees ready for payroll
Blocking issues

This dashboard guides payroll officer action.

Task 17 — Reports

Add reports:

Monthly Attendance Summary
Monthly Labour Timesheet Report
Leave Balance Report
Leave Transaction Report
Overtime Approval Report
Attendance Exception Report

All company-scoped.

Task 18 — Tests

Add backend tests minimum:

30+ tests

Test cases:

Leave opening balance approved
Leave application blocks overlap
Leave application reduces balance
Cancelled leave restores balance
Unpaid leave allowed
Staff auto timesheet generates PRESENT/HOLIDAY/LEAVE
Labour timesheet approval updates daily summary
Overtime approval updates daily summary
Locked attendance period blocks changes
Monthly summary calculates factual payable days
Payroll readiness detects blockers
Company B cannot access Company A leave/attendance
Body company_id ignored
Task 19 — Manual QA

Test:

1. Create Company A/B
2. Create employees staff/labour
3. Create leave opening balance
4. Apply leave
5. Approve leave
6. Generate staff attendance
7. Create labour timesheet
8. Approve labour timesheet
9. Approve overtime
10. Generate monthly summary
11. Check payroll readiness
12. Lock attendance period
13. Try leave/attendance edit
14. Confirm blocked
15. Switch company
16. Confirm isolation