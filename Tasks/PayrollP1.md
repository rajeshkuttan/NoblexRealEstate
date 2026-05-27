Phase P1 — Payroll Domain Foundation & Governance
Current Context

Application:

Enterprise Real Estate Lease Management System

Already completed:

Multi-company architecture
Finance engine
Posting engine
Governance controls
Period controls
Audit framework
System health
Company-wise configuration

Payroll must inherit all existing architecture:

company_settings
company_users
resolveCompanyContext
companyScope
companyAuditService
period controls
document numbering
system integrity layer
RBAC

Do not create parallel systems.

Objective

Build enterprise workforce governance foundation:

Organization structure
Employee governance
Payroll policy structure
Employment framework
Compliance foundation
Payroll audit foundation
Critical Rules

Do NOT implement:

Payroll processing
Salary calculation
Payslips
WPS generation
EOSB calculation
Attendance calculation
Formula engine
Finance posting
ESS

Only create:

Payroll domain foundation
Task 0 — Inspect Existing Structures

Inspect:

backend/src/models
backend/src/routes
backend/src/controllers
backend/src/services
frontend/src/pages
frontend/src/context

Search:

employee
department
branch
designation
cost_center
document
company_id
company_settings

Prepare implementation note:

Existing employee data
Existing cost centre structure
Existing company hierarchy
Existing audit usage
Existing RBAC usage

Do not duplicate existing entities.

Task 1 — Organization Workforce Structure

Create workforce governance entities:

visa_sponsor_companies
departments
designations
employee_grades
employee_levels
cost_centers
employment_categories
workforce_groups
payroll_groups
work_locations

Relationships:

company_settings
    └── Branch
            └── Department
                    └── Designation
                            └── Employee

All entities:

company_id mandatory
audit enabled
status enabled
Task 2 — Visa Sponsor Company

Create:

visa_sponsor_companies

Fields:

id
company_id
sponsor_name
trade_license
labour_establishment_no
mol_number
immigration_file_no
wps_company_code
address
contact_person
phone
email
is_active

Purpose:

Employees may belong to different sponsor companies.

Examples:

Noble Real Estate LLC
Noble Facilities LLC
Third Party Sponsor
Task 3 — Department Governance

Create:

departments

Fields:

company_id
department_code
department_name
parent_department_id
manager_id
cost_center_id
status

Support:

hierarchy

Example:

Operations
   ├─ Property Management
   ├─ Leasing
   └─ Maintenance
Task 4 — Designation Governance

Create:

designations

Fields:

designation_code
designation_name
grade_id
level_id
employment_category_id

Examples:

Property Manager
Leasing Executive
Maintenance Supervisor
Technician
Labour
Task 5 — Workforce Classification

Create:

employment_categories
workforce_groups
payroll_groups

Examples:

Employment:

Permanent
Contract
Temporary
Part Time
Intern

Workforce:

Staff
Labour
Management
Technical

Payroll Groups:

Monthly
Biweekly
Weekly
Task 6 — Shift Governance Foundation

Create:

shift_masters
holiday_calendars
work_calendars

Fields:

shift_name
start_time
end_time
break_time
work_days
overtime_eligible

Purpose:

Used later in:

attendance engine
timesheets
leave
payroll calculation
Task 7 — Leave Policy Foundation

Create:

leave_types
leave_policies
leave_policy_assignments

Examples:

Annual Leave
Sick Leave
Maternity
Emergency Leave
Unpaid Leave
Compensatory Leave

Rules:

Support:

carry forward
encashment
eligibility
probation restrictions

No calculations yet.

Task 8 — Payroll Component Foundation

Create:

payroll_components

Fields:

component_name
component_code
component_type
taxable
recurring
affects_eos
affects_wps
company_id

Component Types:

EARNING
DEDUCTION
EMPLOYER
PROVISION

Examples:

Basic
Housing
Transport
Food
Overtime
Loan Recovery
Insurance
EOS Provision

Do not create formulas yet.

Task 9 — Employee Domain Model

Create enterprise employee structure:

employees
employee_documents
employee_bank_details
employee_salary_structures
employee_history
employee_assignments

Employee fields:

employee_no
employee_name
arabic_name
company_id
branch_id
department_id
designation_id
grade_id
level_id
workforce_group_id
employment_category_id
payroll_group_id
visa_sponsor_company_id
nationality
gender
joining_date
probation_end_date
status
Task 10 — Document Governance

Create:

employee_documents

Document types:

Passport
Visa
Emirates ID
Labour Card
Medical Insurance
Driving License
Contract

Fields:

issue_date
expiry_date
document_number
attachment
alert_days_before
Task 11 — Salary Structure Foundation

Create:

employee_salary_structures
employee_salary_lines

Support:

Basic
Housing
Transport
Fixed allowance
Variable allowance

No calculations yet.

No payroll generation.

Task 12 — Employee History

Create:

employee_history

Track:

Salary revision
Promotion
Transfer
Department change
Designation change
Branch transfer
Sponsor change

Immutable audit history.

Task 13 — Payroll Governance APIs

Create:

/api/payroll/*

Modules:

organization
employees
documents
salary-structure
leave-policy
payroll-components
shift
holiday

All APIs:

authenticate
resolveCompanyContext
RBAC
audit
companyScope
Task 14 — Payroll Permissions

Create:

payroll.organization.view
payroll.organization.manage

payroll.employee.view
payroll.employee.manage

payroll.salary.view
payroll.salary.manage

payroll.document.view
payroll.document.manage

payroll.policy.view
payroll.policy.manage

Reuse existing permission architecture.

Task 15 — Payroll Audit

Add audit actions:

EMPLOYEE_CREATED
EMPLOYEE_UPDATED
SALARY_STRUCTURE_UPDATED
LEAVE_POLICY_ASSIGNED
DOCUMENT_UPLOADED
DOCUMENT_EXPIRED
PROMOTION_RECORDED
TRANSFER_RECORDED
Task 16 — Payroll Admin UI

Create:

/people/payroll

Submodules:

Organization
Employees
Salary Structures
Payroll Components
Leave Policies
Shifts
Documents

Do not overdesign.

Use existing enterprise UI patterns.

Task 17 — Tests

Minimum:

30+ backend tests

Examples:

Employee belongs to active company
Cross-company employee access blocked
Document expiry alerts generated
Salary structure isolation
Leave policy assignment
Promotion history creation
Task 18 — Manual QA
1 Create Company A/B
2 Create departments
3 Create designations
4 Create employee
5 Upload documents
6 Create salary structure
7 Create promotion
8 Switch company
9 Verify isolation
10 Verify audit entries
Deliverables
Enterprise workforce governance layer
Organization structure
Employee governance
Document governance
Payroll policy structure
Audit foundation
Multi-company isolation